# @teranga/core

The shared **domain contract** for Teranga Broadcast — the single place where the
operator console (`apps/web`) and the edge Agent (`apps/agent`) agree on the shape
of every command and event that crosses a process boundary.

## Responsibilities (planned)

- **Command contracts** (`commands.ts`) — console → agent imperatives
  (replay play, scene switch, scoreboard update, export request).
- **Event contracts** (`events.ts`) — agent → console + match-domain events
  (replay marked, asset ready, OBS status changed, goal logged).
- **Validation** — every contract is a `zod` schema; both sides validate at the
  boundary. No `any` crosses processes.
- **Supabase client helpers** — thin, config-driven helpers (URL/keys from env),
  keeping the data-access surface centralized and host-agnostic.

## Dependencies

- `@teranga/types` (workspace) — domain + generated DB types.
- `zod` — runtime validation.

> Status: **placeholder**. Contracts are implemented in Phase 0/1.
> See [docs/03-system-architecture.md](../../docs/03-system-architecture.md).
