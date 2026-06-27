-- ============================================================================
-- Teranga Broadcast — Phase 2: Match Clock (Production Engine authoritative time)
-- Migration: match_clock
--
-- The match_clock row is the Production Engine's authoritative MATCH-TIME source
-- (period + running + anchor). Future engines (Replay, Graphics, Tactics)
-- subscribe to it via Realtime — they never write it (ENGINE_SPECIFICATIONS §10).
-- It is distinct from the Kernel recording timeline (timeline_ms), which arrives
-- with the OBS Agent in a later phase.
--
-- Also extends match_events with 'var_review' and 'injury' types for the Quick
-- Event Panel. Score remains a PROJECTION of goal events (no score table here —
-- match_state display ownership belongs to the future Graphics Engine).
-- ============================================================================

-- 1) Extend the event taxonomy ----------------------------------------------
alter table public.match_events drop constraint if exists match_events_type_check;
alter table public.match_events
  add constraint match_events_type_check check (type in (
    'kickoff','goal','card','substitution','penalty',
    'var_review','injury',
    'period_start','period_end','note','custom'
  ));

-- 2) Authoritative match clock (one row per match, Production-owned) ----------
create table public.match_clock (
  match_id              uuid primary key references public.matches(id) on delete cascade,
  organization_id       uuid not null references public.organizations(id) on delete cascade,

  status                text not null default 'pre_match'
                        check (status in (
                          'pre_match','first_half','half_time','second_half',
                          'extra_time','penalties','full_time'
                        )),
  running               boolean not null default false,

  -- Minute the current period counts from (0 / 45 / 90) and its regulation end.
  period_base_min       integer not null default 0,
  period_regulation_min integer,

  -- ms accrued in the current period before the last pause, and the live anchor.
  accumulated_ms        bigint not null default 0,
  period_started_at     timestamptz,

  updated_at            timestamptz not null default now()
);

create trigger trg_match_clock_updated_at
  before update on public.match_clock
  for each row execute function public.set_updated_at();

-- RLS: members read; producers/operators control the clock.
alter table public.match_clock enable row level security;

create policy match_clock_select on public.match_clock
  for select to authenticated
  using (public.is_org_member(organization_id));

create policy match_clock_insert on public.match_clock
  for insert to authenticated
  with check (
    public.has_org_role(organization_id, array['owner','admin','producer','operator'])
  );

create policy match_clock_update on public.match_clock
  for update to authenticated
  using (
    public.has_org_role(organization_id, array['owner','admin','producer','operator'])
  )
  with check (
    public.has_org_role(organization_id, array['owner','admin','producer','operator'])
  );

grant select, insert, update, delete on public.match_clock to authenticated;
grant select, insert, update, delete on public.match_clock to service_role;

-- Realtime: clients (and future engines) subscribe to live clock changes.
alter publication supabase_realtime add table public.match_clock;
