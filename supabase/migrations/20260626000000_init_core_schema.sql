-- ============================================================================
-- Teranga Broadcast — Phase 0 / M0: core database foundation
-- Migration: init_core_schema
--
-- Scope: multi-tenant core only. NO replay logic, NO media/video storage,
-- NO OBS state. Media stays LOCAL-FIRST (see matches.local_media_path).
--
-- Portability: uses only standard Postgres + the Supabase `auth` schema
-- (auth.users / auth.uid()), both of which exist identically on Supabase Cloud
-- and on self-hosted / on-prem Supabase. No cloud-only features are used.
-- ============================================================================

-- Extensions ----------------------------------------------------------------
create extension if not exists pgcrypto;  -- gen_random_uuid()

-- ============================================================================
-- Shared trigger function: maintain updated_at
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- TABLE: organizations  (the tenant / TV station)
-- ============================================================================
create table public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  locale      text not null default 'fr',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_organizations_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

-- ============================================================================
-- TABLE: organization_members  (user <-> org with role)
-- ============================================================================
create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  role            text not null default 'viewer'
                  check (role in ('owner','admin','producer','operator','viewer')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create index idx_org_members_user on public.organization_members(user_id);

create trigger trg_org_members_updated_at
  before update on public.organization_members
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Tenancy helper functions (SECURITY DEFINER)
--
-- Defined AFTER organization_members because `language sql` bodies are validated
-- at creation time. They bypass RLS on purpose so that RLS policies on
-- organization_members can reference membership WITHOUT infinite recursion.
-- search_path is pinned to '' and every object is schema-qualified to prevent
-- search_path hijacking.
-- ============================================================================
create or replace function public.is_org_member(org uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = org
      and m.user_id = auth.uid()
  );
$$;

create or replace function public.has_org_role(org uuid, roles text[])
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = org
      and m.user_id = auth.uid()
      and m.role = any(roles)
  );
$$;

-- ============================================================================
-- TABLE: venues  (physical locations / stadiums)
-- ============================================================================
create table public.venues (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null,
  city            text,
  country         text default 'SN',          -- Senegal default
  timezone        text not null default 'Africa/Dakar',
  capacity        integer,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_venues_org on public.venues(organization_id);

create trigger trg_venues_updated_at
  before update on public.venues
  for each row execute function public.set_updated_at();

-- ============================================================================
-- TABLE: broadcast_projects  (a season / competition / production effort)
-- ============================================================================
create table public.broadcast_projects (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null,
  description     text,
  status          text not null default 'planning'
                  check (status in ('planning','active','archived')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_projects_org on public.broadcast_projects(organization_id);

create trigger trg_projects_updated_at
  before update on public.broadcast_projects
  for each row execute function public.set_updated_at();

-- ============================================================================
-- TABLE: matches  (a single broadcast event)
--
-- LOCAL-FIRST MEDIA: this table holds metadata only. Replay/recording video is
-- NOT stored in Supabase. `local_media_path` records where the Teranga Agent
-- keeps media on the production machine; `media_storage` documents the strategy.
-- ============================================================================
create table public.matches (
  id                   uuid primary key default gen_random_uuid(),
  organization_id      uuid not null references public.organizations(id) on delete cascade,
  project_id           uuid references public.broadcast_projects(id) on delete set null,
  venue_id             uuid references public.venues(id) on delete set null,

  title                text not null,
  competition          text,
  sport                text not null default 'football',
  home_team            text,
  away_team            text,

  kickoff_at           timestamptz,
  status               text not null default 'scheduled'
                       check (status in ('scheduled','live','halftime','finished','archived')),

  -- Timeline anchors (replay engine reads these later; no logic here yet)
  fps                  integer,                 -- constant frame rate of the recording
  recording_started_at timestamptz,             -- wall-clock anchor of timeline t=0

  -- Local-first media markers (NO video bytes in the database)
  media_storage        text not null default 'local'
                       check (media_storage in ('local','self_hosted','cloud')),
  local_media_path     text,

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index idx_matches_org on public.matches(organization_id);
create index idx_matches_project on public.matches(project_id);
create index idx_matches_status on public.matches(organization_id, status);

create trigger trg_matches_updated_at
  before update on public.matches
  for each row execute function public.set_updated_at();

-- ============================================================================
-- TABLE: audit_logs  (append-only activity trail)
-- ============================================================================
create table public.audit_logs (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_id        uuid references auth.users(id) on delete set null,
  action          text not null,               -- e.g. 'match.created'
  entity_type     text,                         -- e.g. 'match'
  entity_id       uuid,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index idx_audit_org on public.audit_logs(organization_id, created_at desc);

-- ============================================================================
-- ROW-LEVEL SECURITY
-- Enable on every tenant-owned table. Default-deny; policies below grant access
-- only to members of the owning organization, scoped by role for writes.
-- ============================================================================
alter table public.organizations        enable row level security;
alter table public.organization_members enable row level security;
alter table public.venues                enable row level security;
alter table public.broadcast_projects    enable row level security;
alter table public.matches               enable row level security;
alter table public.audit_logs            enable row level security;

-- --- organizations ----------------------------------------------------------
-- Read: any member. Create: any authenticated user (becomes owner via a
-- bootstrap flow / seed using the service role). Update/delete: owner|admin.
create policy organizations_select on public.organizations
  for select to authenticated
  using (public.is_org_member(id));

create policy organizations_insert on public.organizations
  for insert to authenticated
  with check (true);

create policy organizations_update on public.organizations
  for update to authenticated
  using (public.has_org_role(id, array['owner','admin']))
  with check (public.has_org_role(id, array['owner','admin']));

create policy organizations_delete on public.organizations
  for delete to authenticated
  using (public.has_org_role(id, array['owner']));

-- --- organization_members ---------------------------------------------------
-- Read: any member of the org. Manage members: owner|admin.
create policy org_members_select on public.organization_members
  for select to authenticated
  using (public.is_org_member(organization_id));

create policy org_members_insert on public.organization_members
  for insert to authenticated
  with check (public.has_org_role(organization_id, array['owner','admin']));

create policy org_members_update on public.organization_members
  for update to authenticated
  using (public.has_org_role(organization_id, array['owner','admin']))
  with check (public.has_org_role(organization_id, array['owner','admin']));

create policy org_members_delete on public.organization_members
  for delete to authenticated
  using (public.has_org_role(organization_id, array['owner','admin']));

-- --- venues -----------------------------------------------------------------
create policy venues_select on public.venues
  for select to authenticated
  using (public.is_org_member(organization_id));

create policy venues_insert on public.venues
  for insert to authenticated
  with check (public.has_org_role(organization_id, array['owner','admin','producer']));

create policy venues_update on public.venues
  for update to authenticated
  using (public.has_org_role(organization_id, array['owner','admin','producer']))
  with check (public.has_org_role(organization_id, array['owner','admin','producer']));

create policy venues_delete on public.venues
  for delete to authenticated
  using (public.has_org_role(organization_id, array['owner','admin']));

-- --- broadcast_projects -----------------------------------------------------
create policy projects_select on public.broadcast_projects
  for select to authenticated
  using (public.is_org_member(organization_id));

create policy projects_insert on public.broadcast_projects
  for insert to authenticated
  with check (public.has_org_role(organization_id, array['owner','admin','producer']));

create policy projects_update on public.broadcast_projects
  for update to authenticated
  using (public.has_org_role(organization_id, array['owner','admin','producer']))
  with check (public.has_org_role(organization_id, array['owner','admin','producer']));

create policy projects_delete on public.broadcast_projects
  for delete to authenticated
  using (public.has_org_role(organization_id, array['owner','admin']));

-- --- matches ----------------------------------------------------------------
-- Operators may update matches (they run the live show); create stays producer+.
create policy matches_select on public.matches
  for select to authenticated
  using (public.is_org_member(organization_id));

create policy matches_insert on public.matches
  for insert to authenticated
  with check (public.has_org_role(organization_id, array['owner','admin','producer']));

create policy matches_update on public.matches
  for update to authenticated
  using (public.has_org_role(organization_id, array['owner','admin','producer','operator']))
  with check (public.has_org_role(organization_id, array['owner','admin','producer','operator']));

create policy matches_delete on public.matches
  for delete to authenticated
  using (public.has_org_role(organization_id, array['owner','admin']));

-- --- audit_logs (append-only) ----------------------------------------------
-- Read: any member. Insert: any member. No update/delete policies => denied.
create policy audit_select on public.audit_logs
  for select to authenticated
  using (public.is_org_member(organization_id));

create policy audit_insert on public.audit_logs
  for insert to authenticated
  with check (public.is_org_member(organization_id));

-- ============================================================================
-- GRANTS
-- Privileges are explicit (portable to self-hosted, which may not share Cloud's
-- default-privilege setup). RLS still gates every row. anon gets nothing here.
-- ============================================================================
grant usage on schema public to authenticated, service_role;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to service_role;

grant execute on function public.is_org_member(uuid) to authenticated, service_role;
grant execute on function public.has_org_role(uuid, text[]) to authenticated, service_role;
