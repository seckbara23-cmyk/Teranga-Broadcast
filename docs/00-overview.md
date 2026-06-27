# Teranga Broadcast — Project Blueprint

> Enterprise sports broadcast platform for TV stations and production teams.
> First customer focus: **RTS Senegal**.

This `/docs` folder is the founding blueprint for Teranga Broadcast. It defines
*what* we are building, *why*, and *how* before any production application code
is written.

## Document index

| # | Document | Purpose |
|---|----------|---------|
| 01 | [Product Vision](./01-product-vision.md) | The problem, audience, and long-term north star |
| 02 | [MVP Scope](./02-mvp-scope.md) | What ships first, and what explicitly does not |
| 03 | [System Architecture](./03-system-architecture.md) | High-level components and data/media flow |
| 04 | [Folder Structure](./04-folder-structure.md) | Recommended repository layout |
| 05 | [Broadcast Workflow](./05-broadcast-workflow.md) | The live production operator workflow |
| 06 | [Replay Engine Design](./06-replay-engine.md) | The core differentiator, in detail |
| 07 | [OBS Integration Plan](./07-obs-integration.md) | OBS WebSocket control layer |
| 08 | [Database Model Draft](./08-database-model.md) | Supabase / Postgres schema draft |
| 09 | [Development Roadmap](./09-roadmap.md) | Phased delivery plan |
| 10 | [Risks & Technical Challenges](./10-risks.md) | Known hard problems and mitigations |

## Tech stack (agreed)

- **Next.js 16** (App Router) + **React 19**
- **TypeScript** (strict)
- **Tailwind CSS** + **shadcn/ui**
- **Supabase** (Postgres, Auth, Storage, Realtime, Edge Functions)
- **OBS WebSocket** (v5 protocol) for broadcast control
- **pnpm workspaces + Turborepo** monorepo tooling
- Future: **vMix**, **NDI**, **Blackmagic DeckLink/SDI**

## Foundation decisions (locked)

1. **Monorepo from day one** — pnpm workspaces + Turborepo. The operator console
   (`apps/web`) and the edge service (`apps/agent`) share typed contracts via
   `packages/*`. See [04-folder-structure](./04-folder-structure.md).
2. **Supabase Cloud for MVP, portable by design** — the MVP runs on Supabase
   Cloud, but the architecture deliberately keeps the data layer portable so
   Enterprise customers (e.g. RTS) can later run **self-hosted Supabase** or a
   **fully local / on-prem** deployment. See the deployment-portability section in
   [03-system-architecture](./03-system-architecture.md).

## Guiding principles

1. **Operator-first.** A producer in a live truck under time pressure is the
   primary user. Latency, clarity, and "undo" matter more than feature count.
2. **The broadcast must never stop.** The platform augments the broadcast; it
   must fail safe and never take the live signal down.
3. **Local-first where it counts.** Video lives on-prem / on the edge; the cloud
   coordinates metadata, not gigabytes of raw frames, until export time.
4. **Senegal realities.** Intermittent connectivity, mixed hardware, and
   French-first UI are first-class constraints, not afterthoughts.
5. **Composable modules.** Replay, Graphics, Highlights, Archive, and Analytics
   are independent modules over a shared event spine.

> Status: **Blueprint / pre-implementation.** No production app code yet.
