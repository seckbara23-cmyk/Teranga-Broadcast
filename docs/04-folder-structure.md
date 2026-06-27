# 04 — Recommended Folder Structure

A **monorepo** keeps the web app, the edge Agent, and shared types together,
which matters because the operator console and the Agent must agree on the exact
shape of every command and event.

## Top-level layout

```
teranga-broadcast/
├── docs/                      # This blueprint (you are here)
├── apps/
│   ├── web/                   # Next.js 16 operator console + overlays
│   └── agent/                 # Local edge service (OBS + replay + FFmpeg)
├── packages/
│   ├── types/                 # Pure shared types + generated DB types (zero deps)
│   ├── core/                  # Domain logic, command/event contracts, zod schemas
│   ├── obs/                   # Typed OBS WebSocket v5 wrapper (ObsClient intent API)
│   ├── replay/                # Replay buffer + clip math (frame/time utils)
│   └── ui/                    # Shared shadcn/ui components & theme
├── supabase/
│   ├── migrations/            # SQL migrations (source of truth for schema)
│   ├── functions/             # Edge Functions (export jobs, AI hooks)
│   └── seed/                  # Seed data for local dev
├── tooling/                   # Shared tsconfig, ESLint, scripts
├── package.json               # Workspace root (pnpm + turbo)
├── pnpm-workspace.yaml
├── turbo.json
└── README.md
```

> Tooling: **pnpm workspaces + Turborepo** (locked decision). The package graph
> below is established from day one so `apps/web` and `apps/agent` share one set
> of typed contracts.

### Package dependency graph

```
types  ◄── core ◄── obs
   ▲        ▲    ◄── replay
   │        │
   └──── ui └──────────────┐
                           │
   apps/web  ── depends on: types, core, ui, obs (read-only status)
   apps/agent ─ depends on: types, core, obs, replay
```

- **`types`** has zero runtime dependencies — pure types + generated DB types. It
  is the portability seam (see Supabase self-host decision in
  [03-system-architecture](./03-system-architecture.md)).
- **`core`** holds command/event contracts + `zod` schemas + Supabase client
  helpers; both apps import it.
- **`obs`** and **`replay`** are Agent-side capabilities; `obs` also exposes a
  read-only status surface the web app can render.

## `apps/web` — Next.js 16 (App Router)

```
apps/web/
├── src/
│   ├── app/
│   │   ├── (marketing)/             # Public landing (optional)
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── callback/
│   │   ├── (console)/               # Authenticated operator app
│   │   │   ├── layout.tsx
│   │   │   ├── dashboard/
│   │   │   ├── matches/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [matchId]/
│   │   │   │       ├── replay/      # Replay Engine console
│   │   │   │       ├── graphics/    # Scoreboard + overlays control
│   │   │   │       ├── events/      # Match event log
│   │   │   │       └── assets/      # Clips & exports
│   │   │   ├── archive/             # Match archive (later)
│   │   │   └── settings/
│   │   ├── overlay/                 # Rendered INTO OBS as browser sources
│   │   │   ├── scoreboard/[matchId]/
│   │   │   ├── lower-third/[matchId]/
│   │   │   └── ticker/[matchId]/
│   │   ├── api/                     # Route Handlers (RPC, agent webhooks)
│   │   └── layout.tsx
│   ├── components/
│   │   ├── replay/                  # Mark in/out, scrubber, playback deck
│   │   ├── graphics/                # Scoreboard editor, overlay previews
│   │   ├── obs/                     # Connection status, scene switcher
│   │   └── shared/
│   ├── features/                    # Feature-scoped hooks + state + actions
│   │   ├── replay/
│   │   ├── scoreboard/
│   │   ├── events/
│   │   └── obs-control/
│   ├── lib/
│   │   ├── supabase/                # Browser & server clients
│   │   ├── realtime/                # Channel subscriptions
│   │   ├── hotkeys/                 # Operator keyboard bindings
│   │   └── i18n/                    # FR/EN
│   ├── server/                      # Server Actions, auth guards
│   └── styles/
├── public/
├── next.config.ts
└── package.json
```

### Folder conventions
- **`features/`** holds the logic (hooks, state, server actions) for a capability;
  **`components/`** holds its presentational pieces. This keeps the real-time
  console code from sprawling into UI files.
- **`overlay/`** routes are intentionally separate from `(console)` — they are
  unauthenticated-by-token, transparent, and consumed by OBS, not humans.
- Route groups `(auth)`, `(console)`, `(marketing)` separate layouts and access.

## `apps/agent` — local edge service

```
apps/agent/
├── src/
│   ├── obs/                 # OBS WebSocket session, scene/source control
│   ├── replay/              # Ring-buffer recorder, segment index, clip cut
│   ├── export/              # FFmpeg job runner, branding burn-in
│   ├── sync/                # Supabase Realtime subscribe + status reporting
│   ├── assets/             # File registry → Storage upload
│   ├── health/              # Disk, CPU, dropped-frame monitoring
│   └── index.ts             # Service bootstrap
├── config/                  # Per-machine config (paths, OBS port, tokens)
└── package.json
```

## `packages/core` — the shared contract

```
packages/core/
└── src/
    ├── commands.ts          # ReplayCommand, ScoreboardCommand, ObsCommand...
    ├── events.ts            # MatchEvent, ReplayMarked, AssetReady...
    ├── domain.ts            # Match, Team, Clip, Overlay, Asset types
    └── schemas.ts           # Zod schemas validating all of the above
```

> `packages/core` is the single place where the web app and the Agent agree on
> message shapes. Both import from it; `zod` schemas validate at every boundary.

## Naming & style conventions
- Files: `kebab-case.ts`; React components: `PascalCase.tsx`.
- One feature = one folder under `features/`.
- All cross-process messages defined once in `packages/core` and validated with
  `zod`.
- DB types generated into `packages/types` from migrations — never hand-written.
- Strict TypeScript everywhere; no `any` at process boundaries.
