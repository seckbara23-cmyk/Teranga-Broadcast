-- ============================================================================
-- Teranga Broadcast — Phase 4: Graphics Engine Foundation
-- Migration: graphics_foundation
--
-- Graphics-OWNED tables only (ENGINE_SPECIFICATIONS §4 Graphics Engine). The
-- Graphics Engine CONSUMES Production state (match clock, score projection,
-- status, teams, events) — it does NOT duplicate it and creates NO match_state
-- table. Graphics never writes Production or Replay tables.
--
-- graphics_overlays = live on-air show/hide state (one row per match per slot).
-- graphics_instances = reusable operator presets (lower thirds / event cards).
-- graphics_templates = org-custom template registry (built-ins live in code).
-- ============================================================================

-- 1) Live on-air state -------------------------------------------------------
create table public.graphics_overlays (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  match_id        uuid not null references public.matches(id) on delete cascade,
  slot            text not null check (slot in ('scorebug','lower_third','event')),
  visible         boolean not null default false,
  payload         jsonb not null default '{}'::jsonb,
  updated_at      timestamptz not null default now(),
  unique (match_id, slot)
);

create index idx_graphics_overlays_match on public.graphics_overlays(match_id);

create trigger trg_graphics_overlays_updated_at
  before update on public.graphics_overlays
  for each row execute function public.set_updated_at();

-- 2) Reusable presets --------------------------------------------------------
create table public.graphics_instances (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  match_id        uuid not null references public.matches(id) on delete cascade,
  kind            text not null check (kind in ('lower_third','event')),
  label           text not null,
  payload         jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index idx_graphics_instances_match on public.graphics_instances(match_id, created_at desc);

-- 3) Custom template registry (future) --------------------------------------
create table public.graphics_templates (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  key             text not null,
  name            text not null,
  kind            text,
  config          jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  unique (organization_id, key)
);

-- ============================================================================
-- RLS — members read; operators+ manage graphics.
-- ============================================================================
alter table public.graphics_overlays  enable row level security;
alter table public.graphics_instances enable row level security;
alter table public.graphics_templates enable row level security;

create policy graphics_overlays_select on public.graphics_overlays
  for select to authenticated using (public.is_org_member(organization_id));
create policy graphics_overlays_insert on public.graphics_overlays
  for insert to authenticated
  with check (public.has_org_role(organization_id, array['owner','admin','producer','operator']));
create policy graphics_overlays_update on public.graphics_overlays
  for update to authenticated
  using (public.has_org_role(organization_id, array['owner','admin','producer','operator']))
  with check (public.has_org_role(organization_id, array['owner','admin','producer','operator']));
create policy graphics_overlays_delete on public.graphics_overlays
  for delete to authenticated
  using (public.has_org_role(organization_id, array['owner','admin','producer']));

create policy graphics_instances_select on public.graphics_instances
  for select to authenticated using (public.is_org_member(organization_id));
create policy graphics_instances_insert on public.graphics_instances
  for insert to authenticated
  with check (public.has_org_role(organization_id, array['owner','admin','producer','operator']));
create policy graphics_instances_delete on public.graphics_instances
  for delete to authenticated
  using (public.has_org_role(organization_id, array['owner','admin','producer','operator']));

create policy graphics_templates_select on public.graphics_templates
  for select to authenticated using (public.is_org_member(organization_id));
create policy graphics_templates_all on public.graphics_templates
  for all to authenticated
  using (public.has_org_role(organization_id, array['owner','admin','producer']))
  with check (public.has_org_role(organization_id, array['owner','admin','producer']));

grant select, insert, update, delete on public.graphics_overlays  to authenticated, service_role;
grant select, insert, update, delete on public.graphics_instances to authenticated, service_role;
grant select, insert, update, delete on public.graphics_templates to authenticated, service_role;

-- Realtime: operator panels + the overlay publisher track on-air state.
alter publication supabase_realtime add table public.graphics_overlays;
alter publication supabase_realtime add table public.graphics_instances;
