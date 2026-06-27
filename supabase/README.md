# supabase/

Database, Edge Functions, and seed data for Teranga Broadcast.

> Status: **Phase 0 / M0 — core schema landed.** First migration
> (`migrations/20260626000000_init_core_schema.sql`) plus `seed.sql` exist.
> No replay/media/OBS schema yet — this is the multi-tenant foundation only.

## Why migrations are the source of truth

All schema lives in versioned SQL under `migrations/`. This is the key to the
**deployment-portability** decision: the same migrations apply to Supabase Cloud
(MVP) and to a self-hosted / on-prem Supabase instance (Enterprise / RTS) without
code changes. TypeScript DB types are generated from this schema into
`packages/types`.

## Layout

```
supabase/
├── migrations/
│   └── 20260626000000_init_core_schema.sql   # organizations, members, venues,
│                                              # broadcast_projects, matches,
│                                              # audit_logs + RLS + triggers
├── seed.sql                                   # 1 demo org + venue/project/match
├── functions/   (later)                       # Edge Functions
└── README.md
```

## First-time setup

The Supabase CLI is required: https://supabase.com/docs/guides/cli

```bash
# 1. (once) generate the local config.toml if it doesn't exist.
#    Safe to run in this repo — it will not touch existing migrations.
supabase init

# 2. Start the local stack (Postgres, Auth, Realtime, Storage in Docker)
supabase start
```

## Applying migrations + seed (local)

```bash
# Drop, re-create, run ALL migrations, then run seed.sql — the everyday command
supabase db reset
```

`db reset` runs `seed.sql` automatically after the migrations. The seed runs with
the privileged role (RLS bypassed) so it can bootstrap the first organization and
owner — something RLS deliberately prevents normal users from doing.

### Demo login (local only)
`seed.sql` creates a demo owner: **demo@teranga.broadcast** / **teranga-demo**,
member of the `RTS Senegal` org. (Best-effort: if the local `auth` schema rejects
the insert, the org/venue/project/match still seed and you can create a user via
`supabase` Studio.)

## Generating TypeScript types

After any schema change, regenerate the DB types consumed by the app/agent:

```bash
supabase gen types typescript --local > packages/types/src/database.ts
```

This file is **generated, never hand-edited**. Routing DB types through
`@teranga/types` keeps the data layer host-agnostic (Cloud ↔ self-hosted).

## Deploying to a remote project (Cloud or self-hosted)

```bash
supabase link --project-ref <your-project-ref>   # Cloud, or a self-hosted ref
supabase db push                                 # apply migrations remotely
```

> For **self-hosted / on-prem**, point the CLI / connection string at your own
> Supabase instance. The migrations are plain Postgres + the standard `auth`
> schema, so they apply unchanged. Do **not** run `seed.sql` against production.

## Creating organizations (important)

Normal users **must** create organizations through the RPC
`create_organization_with_owner(org_name, org_slug, org_locale)` — added in
`migrations/20260627000000_org_bootstrap_rpc.sql`.

Why: RLS lets a user create an org row but forbids them from inserting their own
first `organization_members` row (only an existing owner/admin can add members).
That would orphan brand-new orgs. The RPC is `SECURITY DEFINER` and atomically
creates **the org + the caller's `owner` membership + an audit row** in one
transaction. The direct `INSERT` policy on `organizations` has therefore been
**removed** — the RPC is the only supported path.

```sql
-- called as an authenticated user (e.g. via supabase-js .rpc())
select * from create_organization_with_owner('RTS Senegal', 'rts-senegal', 'fr');
```

It rejects calls when `auth.uid()` is null (must be authenticated).

## Verifying the schema (RLS tests)

`tests/verify_rls.sql` is a self-asserting, non-destructive script (wrapped in a
rolled-back transaction). It checks:

1. an authenticated user can create an org through the RPC,
2. the owner can see the org and owns it,
3. `audit_logs` remain append-only (UPDATE/DELETE affect 0 rows),
4. the RPC rejects an unauthenticated (null `auth.uid()`) call,
5. a non-member cannot see the org, its members, or its audit logs.

```bash
supabase db reset                         # apply migrations + seed
psql "<local db url>" -f supabase/tests/verify_rls.sql
# Expect a stream of "PASS n: ..." NOTICEs ending in "ALL CHECKS PASSED".
# Any failure RAISEs an exception and aborts.
```

> Requires **Docker** (for `supabase start`) and `psql`. If your environment has
> no Docker, run the above on a machine that does, or point `psql` at any
> Postgres where the migrations have been applied.

### Option B: Node runner (no `psql` needed)

If you have Node + pnpm but not `psql`, use the bundled runner. It reads
`DATABASE_URL` from the environment, **refuses to run if it's missing**, warns
that it is for local/dev/staging only, and **refuses non-local hosts** unless you
explicitly opt in.

```bash
pnpm install   # once, to get the `pg` driver

# DATABASE_URL = your local Supabase Postgres (see `supabase status`)
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres" pnpm db:verify
```

Expected output: a stream of green `✔ PASS n: ...` lines ending in
`✔ ALL CHECKS PASSED`. Any failure prints red and exits non-zero.

To target a non-local dev/staging host (never production), opt in explicitly:

```bash
TERANGA_DB_VERIFY_ALLOW_REMOTE=1 \
  DATABASE_URL="postgresql://user:pass@dev-host:5432/postgres" pnpm db:verify
```

The runner lives at [`scripts/db-verify.mjs`](../scripts/db-verify.mjs) and simply
executes `tests/verify_rls.sql` — the same non-destructive, rolled-back checks.

## What's intentionally NOT here yet

- No replay/clip/asset tables, no media/video storage (media is local-first).
- No OBS/agent-session tables.
- No Edge Functions.

These arrive in later milestones — see
[../docs/09-roadmap.md](../docs/09-roadmap.md).
