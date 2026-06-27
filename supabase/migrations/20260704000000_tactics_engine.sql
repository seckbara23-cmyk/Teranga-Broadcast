-- ============================================================================
-- Teranga Broadcast — Phase 7: Teranga Tactics Engine
-- Migration: tactics_engine
--
-- Tactics-OWNED tables only. The Tactics Engine CONSUMES Replay (a clip's freeze
-- frame is snapshotted into the session), Production (clock/score/events via the
-- app context), and Match metadata — it never writes their tables. Annotations
-- are SEMANTIC vector objects (geometry + style + football meaning), designed so
-- AI can later identify lanes/pressing/offside without a schema redesign.
-- ============================================================================

-- 1) Analysis session — always begins from a replay clip ----------------------
create table public.tactical_sessions (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  match_id        uuid references public.matches(id) on delete set null,
  clip_id         uuid references public.replay_clips(id) on delete set null,

  title           text not null default 'Analyse',
  -- Snapshot of the consumed Replay frame (Tactics does not re-read Replay live).
  freeze_frame_url text,
  match_clock_ms  integer,
  clock_label     text,

  -- Team branding for markers.
  home_color      text not null default '#1f9d55',
  away_color      text not null default '#38bdf8',

  status          text not null default 'draft'
                  check (status in ('draft','active','archived')),
  operator_label  text,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_tactical_sessions_match on public.tactical_sessions(match_id, created_at desc);
create index idx_tactical_sessions_org on public.tactical_sessions(organization_id, created_at desc);

create trigger trg_tactical_sessions_updated_at
  before update on public.tactical_sessions
  for each row execute function public.set_updated_at();

-- 2) Editable vector layers ---------------------------------------------------
create table public.tactical_layers (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  session_id      uuid not null references public.tactical_sessions(id) on delete cascade,
  name            text not null default 'Calque',
  kind            text not null default 'custom',
  visible         boolean not null default true,
  locked          boolean not null default false,
  z_order         integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_tactical_layers_session on public.tactical_layers(session_id, z_order);

create trigger trg_tactical_layers_updated_at
  before update on public.tactical_layers
  for each row execute function public.set_updated_at();

-- 3) Vector annotations — semantic objects (never rasterized) ------------------
create table public.tactical_annotations (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  session_id      uuid not null references public.tactical_sessions(id) on delete cascade,
  layer_id        uuid not null references public.tactical_layers(id) on delete cascade,

  kind            text not null,            -- arrow/line/zone/player/offside_line/... (open for AI)
  geometry        jsonb not null default '{}'::jsonb,  -- normalized points (0..1)
  style           jsonb not null default '{}'::jsonb,  -- color/stroke/fill/opacity
  semantic        jsonb not null default '{}'::jsonb,  -- football meaning: team/player/role/concept
  z_order         integer not null default 0,

  match_clock_ms  integer,
  frame           integer,
  operator_label  text,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_tactical_annotations_session on public.tactical_annotations(session_id);
create index idx_tactical_annotations_layer on public.tactical_annotations(layer_id, z_order);

create trigger trg_tactical_annotations_updated_at
  before update on public.tactical_annotations
  for each row execute function public.set_updated_at();

-- 4) Measurements (distance / angle) ------------------------------------------
create table public.tactical_measurements (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  session_id      uuid not null references public.tactical_sessions(id) on delete cascade,
  annotation_id   uuid references public.tactical_annotations(id) on delete cascade,
  kind            text not null check (kind in ('distance','angle')),
  value           numeric,
  unit            text,
  points          jsonb not null default '[]'::jsonb,
  created_at      timestamptz not null default now()
);

create index idx_tactical_measurements_session on public.tactical_measurements(session_id);

-- 5) Exports (metadata only — no video render) --------------------------------
create table public.tactical_exports (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  session_id      uuid not null references public.tactical_sessions(id) on delete cascade,
  format          text not null check (format in ('png','pdf','svg','replay_package','presentation_package')),
  status          text not null default 'ready' check (status in ('pending','ready','error')),
  path            text,
  metadata        jsonb not null default '{}'::jsonb,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now()
);

create index idx_tactical_exports_session on public.tactical_exports(session_id, created_at desc);

-- ============================================================================
-- RLS — members read; analysts (operators+) manage tactical data.
-- ============================================================================
alter table public.tactical_sessions     enable row level security;
alter table public.tactical_layers       enable row level security;
alter table public.tactical_annotations  enable row level security;
alter table public.tactical_measurements enable row level security;
alter table public.tactical_exports      enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'tactical_sessions','tactical_layers','tactical_annotations',
    'tactical_measurements','tactical_exports'
  ] loop
    execute format(
      'create policy %1$s_select on public.%1$s for select to authenticated using (public.is_org_member(organization_id));',
      t);
    execute format(
      'create policy %1$s_write on public.%1$s for all to authenticated using (public.has_org_role(organization_id, array[''owner'',''admin'',''producer'',''operator''])) with check (public.has_org_role(organization_id, array[''owner'',''admin'',''producer'',''operator'']));',
      t);
    execute format('grant select, insert, update, delete on public.%1$s to authenticated, service_role;', t);
  end loop;
end $$;

-- Realtime: collaborative editing (sessions, layers, annotations).
alter publication supabase_realtime add table public.tactical_sessions;
alter publication supabase_realtime add table public.tactical_layers;
alter publication supabase_realtime add table public.tactical_annotations;
