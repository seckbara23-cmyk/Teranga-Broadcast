# 03 — System Architecture

## Architectural overview

Teranga Broadcast is split into three planes:

1. **Control plane** — the Next.js web app: operator UI, match state, auth,
   metadata. Cloud-hosted (or on-prem) but lightweight.
2. **Media plane** — where actual video lives and is processed: OBS, the local
   recording/replay buffer, FFmpeg, overlay renderers. Runs on-prem / on the edge
   machine.
3. **Coordination plane** — Supabase (Postgres + Realtime + Auth + Storage):
   the shared source of truth and the real-time event bus between operators and
   overlays.

The key design rule: **metadata and commands flow through the cloud; raw video
never does** (until an explicit export).

## Component diagram (logical)

```
                         ┌──────────────────────────────────────┐
                         │            CONTROL PLANE              │
                         │   Next.js 16 / React 19 (App Router)  │
                         │                                       │
   Operators ◄──────────┤  • Operator console (replay/graphics) │
   (browser)            │  • Match setup & event log            │
                         │  • Scoreboard control                 │
                         │  • Asset/clip browser                 │
                         └───────────────┬───────────────────────┘
                                         │  (Realtime + REST/RPC)
                                         ▼
                         ┌──────────────────────────────────────┐
                         │         COORDINATION PLANE            │
                         │              Supabase                 │
                         │  • Postgres (matches, events, assets) │
                         │  • Auth (orgs, roles)                 │
                         │  • Realtime (scoreboard, commands)    │
                         │  • Storage (exported clips, thumbs)   │
                         │  • Edge Functions (export jobs, AI)   │
                         └───────────────┬───────────────────────┘
                                         │  (subscribe / RPC)
              ┌──────────────────────────┼───────────────────────────┐
              ▼                          ▼                           ▼
   ┌────────────────────┐   ┌────────────────────────┐   ┌────────────────────┐
   │  OVERLAY RENDERER  │   │   TERANGA AGENT (edge)  │   │   MEDIA PLANE      │
   │ Next.js route      │   │  Local Node service     │   │  OBS Studio        │
   │ /overlay/* as a    │◄──┤  • OBS WebSocket client │──►│  • Program record  │
   │ transparent        │   │  • Replay buffer mgr    │   │  • Scenes/sources  │
   │ browser source     │   │  • FFmpeg export        │   │  • Browser source  │
   │ (consumed by OBS)  │   │  • File/asset registry  │   │    (overlays)      │
   └────────────────────┘   └────────────────────────┘   └────────────────────┘
```

## The three runtimes

### A. Web app (Next.js 16 / React 19)
- **App Router**, Server Components for data-heavy views, Client Components for
  the real-time operator console.
- Talks to Supabase via the JS client (Realtime subscriptions, RPC, Storage).
- Hosts the **overlay routes** (`/overlay/scoreboard`, `/overlay/lower-third`)
  rendered with a transparent background and consumed by OBS as a Browser Source.
- Server Actions / Route Handlers for privileged operations and Edge Function
  triggers.

### B. Teranga Agent (local edge service) — *introduced because the browser cannot do everything*
A small **Node.js service running on the production machine** next to OBS. It
exists because a browser sandbox cannot reliably:
- Hold a persistent OBS WebSocket control session.
- Manage large local recording files and the replay ring buffer.
- Invoke FFmpeg for frame-accurate cuts and exports.
- Watch disk space and recording health.

The Agent:
- Connects to **OBS WebSocket v5**.
- Manages the **replay buffer** (continuous segmented recording on disk).
- Executes **export jobs** (FFmpeg) on demand.
- Subscribes to Supabase Realtime for commands and reports status back.
- Registers produced files as **assets** in Postgres / Storage.

> MVP note: the Agent and the operator browser are on the same LAN. For the very
> first prototype the Agent may even be embedded as a Next.js custom server /
> local process, but it is designed as a separate service from day one.

### C. OBS Studio
- The actual video engine: capture, scene composition, encoding (NVENC),
  recording, and streaming.
- Driven by the Agent over WebSocket.
- Renders Teranga overlays via Browser Source.

## Data & media flow examples

### Scoreboard update
1. Operator changes score in the console (Client Component).
2. Write to Postgres `match_state`; Supabase Realtime broadcasts the change.
3. The `/overlay/scoreboard` browser source (open inside OBS) is subscribed and
   re-renders instantly.
4. OBS composites the updated overlay into the program feed.

### Replay
1. Operator presses **Mark In** / **Mark Out** (hotkey) in the console.
2. Console sends a replay command (Realtime/RPC) → Agent.
3. Agent locates the frames in the on-disk buffer, prepares the clip, and either
   loads it into an OBS media source or plays it back to the program.
4. The marked clip is registered as an `asset` with in/out timestamps.

### Clip export
1. Operator requests export of a clip.
2. A job row is written; the Agent (or a Supabase Edge Function for cloud-side
   work) picks it up.
3. Agent runs FFmpeg (trim + optional branding burn-in), writes MP4 locally,
   uploads to Supabase Storage, updates the asset row to `ready`.

## Real-time strategy

- **Supabase Realtime** (Postgres changes + broadcast channels) is the primary
  bus for scoreboard/state and operator↔overlay sync.
- **Direct WebSocket (Agent↔OBS)** for low-latency media control — never routed
  through the cloud.
- Latency budget: cloud round-trip for *state* (≤500 ms acceptable); local
  control for *media* (≤100 ms target).

## Deployment topology

| Component | MVP location | Later |
|-----------|--------------|-------|
| Next.js web app | Vercel (or on-prem Node) | Same / self-host option |
| Supabase | **Supabase Cloud** | Self-hosted Supabase / full on-prem |
| Teranga Agent | Production PC (localhost) | OB-van box / dedicated edge server |
| OBS | Production PC | Multiple machines / NDI mesh |

## Deployment portability (decision)

**MVP runs on Supabase Cloud.** Enterprise customers like RTS must be able to move
to **self-hosted Supabase** or a **fully local / on-prem** stack without a rewrite.
To keep that path open, the architecture observes these rules from day one:

- **No Supabase-proprietary-only features on the critical path.** Supabase is
  open-source and self-hostable; we use Postgres, Auth (GoTrue), Realtime,
  Storage, and Edge Functions — all of which exist in the self-hosted distribution.
- **Schema is the source of truth.** All schema lives in versioned SQL migrations
  under `supabase/migrations`, portable to any Postgres/Supabase instance.
- **Config-driven endpoints.** Supabase URL + keys come from environment
  variables only; nothing hardcodes the cloud host. A self-hosted URL is a config
  change, not a code change.
- **Data-access seam.** The web app and Agent reach Supabase through helpers in
  `packages/core` (and generated types in `packages/types`), so the client
  surface is centralized and swappable.
- **Media never depended on the cloud.** Recording, replay, and overlays already
  run locally (see resilience below), so an air-gapped/on-prem deployment changes
  *where metadata lives*, not how the broadcast runs.

| Deployment tier | Web app | Data layer | Target customer |
|-----------------|---------|-----------|-----------------|
| **Cloud (MVP)** | Vercel | Supabase Cloud | Pilot / RTS first matches |
| **Hybrid** | On-prem Node | Supabase Cloud | Station with stable uplink |
| **On-prem / self-hosted** | On-prem Node | Self-hosted Supabase (Docker) | Enterprise / air-gapped OB van |

## Security & boundaries
- Agent authenticates to Supabase with a scoped service/agent token bound to an
  org + match.
- Overlay routes are read-only and use a short-lived signed token per match so a
  leaked URL can't be abused.
- Row-Level Security (RLS) scopes every table by `org_id`.

## Why this shape
- **Resilience:** if the cloud drops (Senegal connectivity reality), the Agent +
  OBS keep recording and replaying locally; state re-syncs on reconnect.
- **Cost:** no bulk video egress to the cloud.
- **Extensibility:** NDI/vMix/Blackmagic later become new capabilities of the
  Agent, not rewrites of the web app.

## Future module: Teranga Tactics (architecture note)

**Teranga Tactics** (tactical analysis — see
[11-teranga-tactics](./11-teranga-tactics.md)) is a **future** module and is
**not** part of the current build (Replay Engine + Auth/Tenant remain the
priority). It is intentionally designed as a **composition of existing planes**,
not a new silo:

- **Control plane:** a `features/tactics` area and an analysis surface route in
  `apps/web`; telestration renders as a canvas/SVG layer over a replay clip
  (conceptually the same overlay pattern used for graphics).
- **Media plane:** paused frames and clips come from the **Replay Engine** buffer;
  telestration burn-in and tactical-clip export reuse the **FFmpeg export**
  pipeline in the Agent; "send to broadcast" reuses the asset → OBS media-source
  path.
- **Coordination plane:** the analysis dashboard derives its stats from the
  **match event spine** plus new tactical tagging; future tables
  (`tactical_analyses`, `tactical_annotations`, `tactical_stats`) are
  `organization_id`-scoped under the same RLS model.

No new runtime is introduced — Teranga Tactics adds capabilities to the web app
and the Agent rather than a fourth plane.
