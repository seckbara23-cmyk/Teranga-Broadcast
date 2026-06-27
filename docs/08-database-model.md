# 08 — Database Model Draft

This is a **draft** Postgres/Supabase schema for the MVP plus near-term modules.
It is intentionally not final — it exists to validate the domain model before any
migrations are written.

> ## Implementation status (Phase 0 / M0)
>
> The **first migration is now live**:
> `supabase/migrations/20260626000000_init_core_schema.sql`. It implements a
> refined core that differs slightly from the original draft below:
>
> | Implemented in M0 | Notes vs. this draft |
> |-------------------|----------------------|
> | `organizations` | as drafted |
> | `organization_members` | replaces draft `memberships` (clearer name); roles add `owner` |
> | `venues` | **new** in M0 (was a future table) |
> | `broadcast_projects` | generalizes draft `competitions` into a production container |
> | `matches` | simplified: `home_team`/`away_team` are text for now (no `teams` table yet); adds `local_media_path` + `media_storage` for **local-first media** |
> | `audit_logs` | **new** in M0, append-only |
>
> Still **deferred** (drafted below, not yet migrated): `profiles`, `teams`,
> `match_state`, `match_events`, `replay_marks`, `assets`, `overlays`,
> `agent_sessions`, `jobs`. These land with the replay/graphics milestones. The
> sections below remain the forward-looking target.
>
> ### M0.1 — org bootstrap (`20260627000000_org_bootstrap_rpc.sql`)
>
> The direct `INSERT` policy on `organizations` is **removed**. Normal users
> create organizations only via the `SECURITY DEFINER` RPC
> `create_organization_with_owner(name, slug, locale)`, which atomically creates
> the org, the caller's `owner` membership, and an audit row. This guarantees
> every organization has an owner and closes the RLS chicken-and-egg gap (a user
> cannot self-insert their first membership). The RPC rejects calls with a null
> `auth.uid()`. Verified by `supabase/tests/verify_rls.sql`.

## Modeling principles
- **Multi-tenant by `org_id`** with Row-Level Security on every table.
- **One time base per match:** events, marks, and segments reference milliseconds
  on the match recording timeline.
- **Assets are first-class:** every clip/export/recording is an `asset`.
- UUID primary keys; `created_at` / `updated_at` everywhere; soft-delete via
  `deleted_at` where useful.

## Entity overview

```
organizations 1───* users (via memberships)
organizations 1───* teams
organizations 1───* competitions
organizations 1───* matches
matches       1───* match_events
matches       1───1 match_state        (live scoreboard/clock)
matches       1───* replay_marks
matches       1───* assets
replay_marks  1───* assets             (a mark can yield clips/exports)
matches       1───* overlays           (overlay instances/config)
matches       1───* agent_sessions     (which Agent ran the match)
matches       1───* jobs               (export/AI jobs)
```

## Tables (draft DDL sketch)

> Illustrative SQL — column types and constraints will be refined in real
> migrations.

```sql
-- Tenancy ------------------------------------------------------------------
create table organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  locale      text not null default 'fr',
  created_at  timestamptz not null default now()
);

-- users mirrors auth.users; profile + org membership
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  created_at  timestamptz not null default now()
);

create table memberships (
  org_id      uuid not null references organizations(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  role        text not null check (role in ('admin','producer','operator','viewer')),
  created_at  timestamptz not null default now(),
  primary key (org_id, user_id)
);

-- Reference data -----------------------------------------------------------
create table teams (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  name        text not null,
  short_name  text,
  logo_url    text,
  primary_color text,
  created_at  timestamptz not null default now()
);

create table competitions (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  name        text not null,
  season      text,
  sport       text not null default 'football'
);

-- Match --------------------------------------------------------------------
create table matches (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references organizations(id) on delete cascade,
  competition_id uuid references competitions(id),
  home_team_id   uuid references teams(id),
  away_team_id   uuid references teams(id),
  title          text,
  kickoff_at     timestamptz,
  status         text not null default 'scheduled'
                 check (status in ('scheduled','live','halftime','finished','archived')),
  fps            integer,                 -- recording frame rate (CFR)
  recording_started_at timestamptz,       -- wall-clock anchor of timeline t=0
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Live scoreboard / clock (one row per match) ------------------------------
create table match_state (
  match_id     uuid primary key references matches(id) on delete cascade,
  home_score   integer not null default 0,
  away_score   integer not null default 0,
  period       text not null default 'pre'      -- pre|1H|HT|2H|ET|PEN|post
                check (period in ('pre','1H','HT','2H','ET','PEN','post')),
  clock_ms     integer not null default 0,       -- match clock in ms
  clock_running boolean not null default false,
  updated_at   timestamptz not null default now()
);

-- Match events (the spine) -------------------------------------------------
create table match_events (
  id           uuid primary key default gen_random_uuid(),
  match_id     uuid not null references matches(id) on delete cascade,
  type         text not null
               check (type in ('goal','card','substitution','penalty',
                               'period_start','period_end','custom')),
  team_id      uuid references teams(id),
  timeline_ms  integer not null,        -- position on recording timeline
  match_clock_ms integer,               -- displayed match clock at the event
  payload      jsonb not null default '{}',  -- scorer, card color, players, etc.
  created_by   uuid references profiles(id),
  created_at   timestamptz not null default now()
);

-- Replay marks -------------------------------------------------------------
create table replay_marks (
  id           uuid primary key default gen_random_uuid(),
  match_id     uuid not null references matches(id) on delete cascade,
  event_id     uuid references match_events(id) on delete set null,
  in_ms        integer not null,
  out_ms       integer not null,
  speed        numeric not null default 1.0,   -- 1.0 / 0.5 / 0.25
  label        text,
  created_by   uuid references profiles(id),
  created_at   timestamptz not null default now()
);

-- Assets (recordings, clips, exports, thumbnails) --------------------------
create table assets (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations(id) on delete cascade,
  match_id     uuid references matches(id) on delete cascade,
  mark_id      uuid references replay_marks(id) on delete set null,
  type         text not null
               check (type in ('full_recording','replay_clip','export','thumbnail')),
  status       text not null default 'pending'
               check (status in ('pending','processing','ready','error')),
  storage_path text,                  -- Supabase Storage path (when uploaded)
  local_path   text,                  -- Agent local path
  duration_ms  integer,
  width        integer,
  height       integer,
  size_bytes   bigint,
  branding_preset text,
  created_at   timestamptz not null default now()
);

-- Overlays (configured graphics instances) ---------------------------------
create table overlays (
  id           uuid primary key default gen_random_uuid(),
  match_id     uuid not null references matches(id) on delete cascade,
  kind         text not null check (kind in ('scoreboard','lower_third','ticker')),
  config       jsonb not null default '{}',
  is_visible   boolean not null default false,
  updated_at   timestamptz not null default now()
);

-- Agent sessions & jobs ----------------------------------------------------
create table agent_sessions (
  id           uuid primary key default gen_random_uuid(),
  match_id     uuid not null references matches(id) on delete cascade,
  agent_name   text,
  obs_version  text,
  status       text not null default 'online',  -- online|offline|error
  last_seen_at timestamptz not null default now(),
  stats        jsonb not null default '{}'       -- dropped frames, disk, cpu
);

create table jobs (
  id           uuid primary key default gen_random_uuid(),
  match_id     uuid references matches(id) on delete cascade,
  type         text not null check (type in ('export','ai_detect','upload')),
  status       text not null default 'queued'
               check (status in ('queued','running','done','error')),
  input        jsonb not null default '{}',
  result       jsonb not null default '{}',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
```

## Realtime usage
- `match_state` → subscribed by overlay browser sources (scoreboard/clock).
- `overlays` → visibility/config changes for lower-thirds/ticker.
- `match_events`, `replay_marks` → operator console live updates.
- `agent_sessions` → live OBS/Agent health in the console.
- A Supabase **broadcast channel** per match carries low-latency command messages
  (e.g. "play replay") that don't need persistence.

## Row-Level Security (sketch)
- Every table with `org_id`: a member of that org may read; write gated by role.
- `overlays` / `match_state` read access also grantable via a **signed match
  token** for the unauthenticated overlay browser sources (read-only).
- `assets.storage_path` access via Supabase Storage policies bound to org.

## Indexing notes
- `match_events (match_id, timeline_ms)` — timeline queries.
- `replay_marks (match_id, in_ms)` — replay listing.
- `assets (match_id, type, status)` — asset browser.
- `jobs (status, type)` — job pickup by Agent/Edge Functions.

## Future tables (later phases)
- `cameras` / `angles` — multi-camera replay.
- `highlight_reels` + `reel_items` — Highlight Studio.
- `ai_detections` — AI event candidates pending operator confirmation.
- `social_publications` — social export/publish tracking.
- `archive_tags` — searchable archive taxonomy.
