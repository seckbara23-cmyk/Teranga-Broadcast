-- ============================================================================
-- Teranga Broadcast — Phase 3: Replay Engine Foundation (metadata only)
-- Migration: replay_foundation
--
-- Replay-OWNED tables only (ENGINE_SPECIFICATIONS §3). Replay never writes
-- Production tables; it consumes the Production match clock via the app's
-- Production context (the clock value is passed into Replay actions). NO video,
-- NO clips, NO exports yet — just marks, queue, and playlists.
-- ============================================================================

-- 1) Replay marks ------------------------------------------------------------
create table public.replay_marks (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  match_id         uuid not null references public.matches(id) on delete cascade,

  type             text not null check (type in (
                     'goal','penalty','var','save','chance','corner','free_kick',
                     'card','substitution','crowd','celebration','custom'
                   )),

  -- Snapshot of the Production match clock at mark time (consumed, not owned).
  match_clock_ms   integer,
  clock_label      text,

  source           text not null default 'program',  -- future: camera/angle id
  note             text,

  -- Denormalised operator label so the queue/marks views can show who marked.
  operator_label   text,
  created_by       uuid references auth.users(id) on delete set null,
  created_at       timestamptz not null default now()
);

create index idx_replay_marks_match on public.replay_marks(match_id, created_at desc);

-- 2) Replay queue (ordered list of marks staged for playout) ----------------
create table public.replay_queue (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  match_id         uuid not null references public.matches(id) on delete cascade,
  mark_id          uuid not null references public.replay_marks(id) on delete cascade,

  position         integer not null default 0,
  status           text not null default 'queued'
                   check (status in ('queued','ready','replay_later','played')),

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index idx_replay_queue_match on public.replay_queue(match_id, position);

create trigger trg_replay_queue_updated_at
  before update on public.replay_queue
  for each row execute function public.set_updated_at();

-- 3) Replay playlists (future highlight packages) ---------------------------
create table public.replay_playlists (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  match_id         uuid not null references public.matches(id) on delete cascade,
  name             text not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index idx_replay_playlists_match on public.replay_playlists(match_id, created_at desc);

create trigger trg_replay_playlists_updated_at
  before update on public.replay_playlists
  for each row execute function public.set_updated_at();

create table public.playlist_items (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  playlist_id      uuid not null references public.replay_playlists(id) on delete cascade,
  mark_id          uuid not null references public.replay_marks(id) on delete cascade,
  position         integer not null default 0,
  created_at       timestamptz not null default now()
);

create index idx_playlist_items_playlist on public.playlist_items(playlist_id, position);

-- ============================================================================
-- RLS — members read; operators+ manage replay (operators run replay live).
-- ============================================================================
alter table public.replay_marks     enable row level security;
alter table public.replay_queue     enable row level security;
alter table public.replay_playlists enable row level security;
alter table public.playlist_items   enable row level security;

-- replay_marks
create policy replay_marks_select on public.replay_marks
  for select to authenticated using (public.is_org_member(organization_id));
create policy replay_marks_insert on public.replay_marks
  for insert to authenticated
  with check (public.has_org_role(organization_id, array['owner','admin','producer','operator']));
create policy replay_marks_update on public.replay_marks
  for update to authenticated
  using (public.has_org_role(organization_id, array['owner','admin','producer','operator']))
  with check (public.has_org_role(organization_id, array['owner','admin','producer','operator']));
create policy replay_marks_delete on public.replay_marks
  for delete to authenticated
  using (public.has_org_role(organization_id, array['owner','admin','producer']));

-- replay_queue
create policy replay_queue_select on public.replay_queue
  for select to authenticated using (public.is_org_member(organization_id));
create policy replay_queue_insert on public.replay_queue
  for insert to authenticated
  with check (public.has_org_role(organization_id, array['owner','admin','producer','operator']));
create policy replay_queue_update on public.replay_queue
  for update to authenticated
  using (public.has_org_role(organization_id, array['owner','admin','producer','operator']))
  with check (public.has_org_role(organization_id, array['owner','admin','producer','operator']));
create policy replay_queue_delete on public.replay_queue
  for delete to authenticated
  using (public.has_org_role(organization_id, array['owner','admin','producer','operator']));

-- replay_playlists
create policy replay_playlists_select on public.replay_playlists
  for select to authenticated using (public.is_org_member(organization_id));
create policy replay_playlists_insert on public.replay_playlists
  for insert to authenticated
  with check (public.has_org_role(organization_id, array['owner','admin','producer','operator']));
create policy replay_playlists_update on public.replay_playlists
  for update to authenticated
  using (public.has_org_role(organization_id, array['owner','admin','producer','operator']))
  with check (public.has_org_role(organization_id, array['owner','admin','producer','operator']));
create policy replay_playlists_delete on public.replay_playlists
  for delete to authenticated
  using (public.has_org_role(organization_id, array['owner','admin','producer']));

-- playlist_items
create policy playlist_items_select on public.playlist_items
  for select to authenticated using (public.is_org_member(organization_id));
create policy playlist_items_insert on public.playlist_items
  for insert to authenticated
  with check (public.has_org_role(organization_id, array['owner','admin','producer','operator']));
create policy playlist_items_delete on public.playlist_items
  for delete to authenticated
  using (public.has_org_role(organization_id, array['owner','admin','producer','operator']));

grant select, insert, update, delete on public.replay_marks     to authenticated, service_role;
grant select, insert, update, delete on public.replay_queue     to authenticated, service_role;
grant select, insert, update, delete on public.replay_playlists to authenticated, service_role;
grant select, insert, update, delete on public.playlist_items   to authenticated, service_role;

-- Realtime: marks, queue, playlists update instantly across clients.
alter publication supabase_realtime add table public.replay_marks;
alter publication supabase_realtime add table public.replay_queue;
alter publication supabase_realtime add table public.replay_playlists;
alter publication supabase_realtime add table public.playlist_items;
