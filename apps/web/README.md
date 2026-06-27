# @teranga/web

The Teranga Broadcast **operator console** and **OBS overlay routes** —
Next.js 16 (App Router) + React 19.

> Status: **placeholder structure** only. No application logic is implemented yet.
> The route plan below is the target layout from
> [docs/04-folder-structure.md](../../docs/04-folder-structure.md).

## Two responsibilities

1. **Operator console** (`src/app/(console)/...`) — authenticated, real-time UI
   for replay, graphics/scoreboard, the event log, and assets.
2. **Overlay routes** (`src/app/overlay/...`) — transparent pages rendered *into*
   OBS as Browser Sources, driven by Supabase Realtime and authorized by a
   per-match signed token.

## Planned route layout

```
src/app/
├── (auth)/            login, callback
├── (console)/         dashboard, matches/[matchId]/{replay,graphics,events,assets}
├── overlay/           scoreboard/[matchId], lower-third/[matchId], ticker/[matchId]
└── api/               route handlers (RPC, agent webhooks)
```

See the full breakdown (`components/`, `features/`, `lib/`, `server/`) in
[docs/04-folder-structure.md](../../docs/04-folder-structure.md).

## Configuration

Copy `.env.example` → `.env.local`. Supabase URL/keys come from env only — moving
to self-hosted Supabase is a config change, not a code change.

## Workspace dependencies

`@teranga/ui`, `@teranga/core`, `@teranga/obs` (read-only status), `@teranga/types`.

> Dependencies are not installed yet, and the Next.js `app/` tree is intentionally
> not scaffolded with real pages — this is foundation only.
