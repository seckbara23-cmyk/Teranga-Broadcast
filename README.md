# Teranga Broadcast

> Enterprise sports broadcast platform for TV stations and production teams.
> First customer focus: **RTS Senegal**.

Teranga Broadcast is a software-defined production platform that unifies replay,
graphics, scoreboards, highlights, archive, and distribution into one
operator-friendly web app backed by a real-time event model — turning a live
match into instant replays, on-air graphics, and shareable clips without a
million-dollar hardware truck.

> **Status: Foundation / pre-implementation.** This repository currently contains
> the project blueprint ([`/docs`](./docs)) and the monorepo scaffolding. There is
> no production application logic yet — packages are placeholders.

## Documentation

The full blueprint lives in [`/docs`](./docs/00-overview.md):

1. [Product Vision](./docs/01-product-vision.md)
2. [MVP Scope](./docs/02-mvp-scope.md)
3. [System Architecture](./docs/03-system-architecture.md)
4. [Folder Structure](./docs/04-folder-structure.md)
5. [Broadcast Workflow](./docs/05-broadcast-workflow.md)
6. [Replay Engine Design](./docs/06-replay-engine.md)
7. [OBS Integration Plan](./docs/07-obs-integration.md)
8. [Database Model Draft](./docs/08-database-model.md)
9. [Development Roadmap](./docs/09-roadmap.md)
10. [Risks & Technical Challenges](./docs/10-risks.md)

## Tech stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript** (strict)
- **Tailwind CSS** + **shadcn/ui**
- **Supabase** — Postgres, Auth, Storage, Realtime, Edge Functions
- **OBS WebSocket v5** for broadcast control
- **pnpm workspaces + Turborepo** monorepo tooling

## Foundation decisions

- **Monorepo from day one** (pnpm + Turborepo) so the operator console and the
  edge Agent share typed contracts.
- **Supabase Cloud for the MVP, portable by design** — Enterprise customers like
  RTS can later move to self-hosted Supabase or a fully on-prem deployment without
  a rewrite. See the portability section of
  [System Architecture](./docs/03-system-architecture.md#deployment-portability-decision).

## Monorepo layout

```
teranga-broadcast/
├── docs/                 # Project blueprint
├── apps/
│   ├── web/              # Next.js 16 operator console + OBS overlays
│   └── agent/            # Local edge service (OBS control, replay buffer, FFmpeg)
├── packages/
│   ├── types/            # Pure shared types + generated DB types (zero runtime deps)
│   ├── core/             # Domain logic, command/event contracts, zod schemas
│   ├── obs/              # Typed OBS WebSocket v5 client (intent-level API)
│   ├── replay/           # Replay buffer + clip/frame math
│   └── ui/               # Shared shadcn/ui components & theme
├── supabase/             # Migrations, Edge Functions, seed (added later)
└── tooling/              # Shared tsconfig & lint config
```

### Package dependency direction

```
types ◄── core ◄── obs, replay
   ▲       ▲
   └── ui  └── apps/web, apps/agent
```

`types` has zero runtime dependencies and is the portability seam for the data
layer.

## Getting started (when implementation begins)

> Dependencies are **not** installed yet. These are the intended commands.

```bash
# Install all workspace dependencies
pnpm install

# Run everything in dev (web + agent)
pnpm dev

# Type-check / lint / build the whole graph
pnpm typecheck
pnpm lint
pnpm build
```

Environment configuration will use `.env.example` files per app (Supabase URL/
keys, OBS WebSocket host/password). Nothing hardcodes the cloud host — pointing at
a self-hosted Supabase instance is a config change only.

## Roadmap snapshot

- **Phase 0 — Foundations** *(in progress)*: monorepo, contracts, auth, OBS status.
- **Phase 1 — MVP core loop**: replay engine, scoreboard/overlays, event log,
  clip export.
- **Phase 2 — Hardening & digital**: resilience, Highlight Studio, Archive.
- **Phase 3 — Intelligence & multi-source**: AI detection, multi-cam, NDI, vMix,
  analytics, and **Teranga Tactics** foundations (tactical analysis).
- **Phase 4 — Scale & platform**: SDI/Blackmagic, on-prem packaging, marketplace,
  full **Teranga Tactics**.

> **Future module — Teranga Tactics:** a football tactical analysis module
> (telestration on paused video + match analysis dashboard) for journalists and
> analysts. Documented in [docs/11-teranga-tactics.md](./docs/11-teranga-tactics.md);
> **not yet scheduled** — the Replay Engine and Auth/Tenant foundation remain the
> current priority.

See [Development Roadmap](./docs/09-roadmap.md) for detail.

## License

Proprietary — © Teranga Broadcast. All rights reserved (placeholder).
