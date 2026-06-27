-- ============================================================================
-- Teranga Broadcast — Phase 1: match_events (Production Engine spine table)
-- Migration: match_events
--
-- The match event log is a PRIMARY entry on the broadcast event spine
-- (ENGINE_SPECIFICATIONS §2 Production Engine, §12 timeline). Events are
-- anchored to the match recording timeline (timeline_ms) when known. No replay,
-- graphics, or scoreboard logic here — just the operating spine.
-- ============================================================================

create table public.match_events (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  match_id        uuid not null references public.matches(id) on delete cascade,

  type            text not null
                  check (type in (
                    'kickoff','goal','card','substitution','penalty',
                    'period_start','period_end','note','custom'
                  )),
  team            text check (team in ('home','away')),   -- nullable (no teams table yet)

  -- Timeline anchors (Kernel TimelineService owns the clock; may be null pre-record)
  timeline_ms     integer,
  match_clock_ms  integer,

  label           text,
  payload         jsonb not null default '{}'::jsonb,

  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now()
);

create index idx_match_events_match_timeline
  on public.match_events(match_id, timeline_ms);
create index idx_match_events_match_created
  on public.match_events(match_id, created_at desc);

-- RLS: members read; producers/operators log; producers/admins correct/remove.
alter table public.match_events enable row level security;

create policy match_events_select on public.match_events
  for select to authenticated
  using (public.is_org_member(organization_id));

create policy match_events_insert on public.match_events
  for insert to authenticated
  with check (
    public.has_org_role(organization_id, array['owner','admin','producer','operator'])
  );

create policy match_events_update on public.match_events
  for update to authenticated
  using (public.has_org_role(organization_id, array['owner','admin','producer']))
  with check (public.has_org_role(organization_id, array['owner','admin','producer']));

create policy match_events_delete on public.match_events
  for delete to authenticated
  using (public.has_org_role(organization_id, array['owner','admin','producer']));

grant select, insert, update, delete on public.match_events to authenticated;
grant select, insert, update, delete on public.match_events to service_role;

-- Realtime: the Event Timeline subscribes to live inserts for the open match.
alter publication supabase_realtime add table public.match_events;
