-- ============================================================================
-- Teranga Broadcast — Phase 6: Instant Replay Engine
-- Migration: instant_replay
--
-- Replay-OWNED tables for the five-layer pipeline: buffer → extraction → queue →
-- output → archive. Metadata + file paths only (the Agent owns media). Does NOT
-- duplicate Production data. Extends the Phase 3 replay_queue to be clip-based.
-- ============================================================================

-- 1) Replay buffer — rolling segment index (Agent writes; web reads status) ---
create table public.replay_segments (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  agent_id        uuid references public.broadcast_agents(id) on delete set null,
  camera_id       text not null default 'program',
  seq             bigint not null,
  path            text not null,
  started_at      timestamptz,
  ended_at        timestamptz,
  duration_ms     integer,
  size_bytes      bigint,
  created_at      timestamptz not null default now()
);

create index idx_replay_segments_org on public.replay_segments(organization_id, created_at desc);
create index idx_replay_segments_cam on public.replay_segments(organization_id, camera_id, seq);

-- 2) Replay clips — extraction output (the durable clip entity) ---------------
create table public.replay_clips (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  match_id        uuid not null references public.matches(id) on delete cascade,
  mark_id         uuid references public.replay_marks(id) on delete set null,

  camera_id       text not null default 'program',
  clip_type       text not null default 'replay',
  match_clock_ms  integer,
  clock_label     text,
  operator_label  text,
  created_by      uuid references auth.users(id) on delete set null,

  pre_roll_s      integer not null default 10,
  post_roll_s     integer not null default 5,
  duration_s      integer not null default 15,

  status          text not null default 'pending'
                  check (status in ('pending','extracting','ready','error')),
  name            text,
  clip_path       text,
  thumbnail_path  text,
  archived        boolean not null default false,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_replay_clips_match on public.replay_clips(match_id, created_at desc);

create trigger trg_replay_clips_updated_at
  before update on public.replay_clips
  for each row execute function public.set_updated_at();

-- 3) Replay archive — searchable persistent library ---------------------------
create table public.replay_archive (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  match_id        uuid references public.matches(id) on delete set null,
  clip_id         uuid references public.replay_clips(id) on delete set null,
  title           text not null,
  camera_id       text,
  operator_label  text,
  duration_s      integer,
  clip_path       text,
  thumbnail_path  text,
  search_text     text,
  created_at      timestamptz not null default now()
);

create index idx_replay_archive_org on public.replay_archive(organization_id, created_at desc);

-- 4) Clip tags ----------------------------------------------------------------
create table public.clip_tags (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  clip_id         uuid not null references public.replay_clips(id) on delete cascade,
  tag             text not null,
  created_at      timestamptz not null default now(),
  unique (clip_id, tag)
);

create index idx_clip_tags_clip on public.clip_tags(clip_id);

-- 5) Extend the Phase 3 replay_queue to be clip-based -------------------------
alter table public.replay_queue alter column mark_id drop not null;
alter table public.replay_queue
  add column clip_id uuid references public.replay_clips(id) on delete cascade;
alter table public.replay_queue add column name text;
alter table public.replay_queue drop constraint if exists replay_queue_status_check;
alter table public.replay_queue
  add constraint replay_queue_status_check
  check (status in ('queued','ready','replay_later','played','skipped'));

-- ============================================================================
-- RLS — members read; operators+ manage replay; the Agent writes via service role
-- ============================================================================
alter table public.replay_segments enable row level security;
alter table public.replay_clips    enable row level security;
alter table public.replay_archive  enable row level security;
alter table public.clip_tags       enable row level security;

-- replay_segments: members read; owner/admin manage (Agent uses service role)
create policy replay_segments_select on public.replay_segments
  for select to authenticated using (public.is_org_member(organization_id));
create policy replay_segments_manage on public.replay_segments
  for all to authenticated
  using (public.has_org_role(organization_id, array['owner','admin']))
  with check (public.has_org_role(organization_id, array['owner','admin']));

-- clips / archive / tags: operators+ manage
create policy replay_clips_select on public.replay_clips
  for select to authenticated using (public.is_org_member(organization_id));
create policy replay_clips_write on public.replay_clips
  for all to authenticated
  using (public.has_org_role(organization_id, array['owner','admin','producer','operator']))
  with check (public.has_org_role(organization_id, array['owner','admin','producer','operator']));

create policy replay_archive_select on public.replay_archive
  for select to authenticated using (public.is_org_member(organization_id));
create policy replay_archive_write on public.replay_archive
  for all to authenticated
  using (public.has_org_role(organization_id, array['owner','admin','producer','operator']))
  with check (public.has_org_role(organization_id, array['owner','admin','producer','operator']));

create policy clip_tags_select on public.clip_tags
  for select to authenticated using (public.is_org_member(organization_id));
create policy clip_tags_write on public.clip_tags
  for all to authenticated
  using (public.has_org_role(organization_id, array['owner','admin','producer','operator']))
  with check (public.has_org_role(organization_id, array['owner','admin','producer','operator']));

grant select, insert, update, delete on public.replay_segments to authenticated, service_role;
grant select, insert, update, delete on public.replay_clips    to authenticated, service_role;
grant select, insert, update, delete on public.replay_archive  to authenticated, service_role;
grant select, insert, update, delete on public.clip_tags       to authenticated, service_role;

-- Realtime: queue, extraction, preview status, archive sync instantly.
alter publication supabase_realtime add table public.replay_segments;
alter publication supabase_realtime add table public.replay_clips;
alter publication supabase_realtime add table public.replay_archive;
alter publication supabase_realtime add table public.clip_tags;
