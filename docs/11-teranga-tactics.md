# 11 — Teranga Tactics (Future Module)

> **Status: FUTURE / not scheduled for implementation.** This document specifies
> a planned module so the architecture can accommodate it. It is **not** part of
> the current build. The current priorities remain the **Replay Engine** and the
> **Auth / Tenant foundation** — see [09-roadmap](./09-roadmap.md).

## What it is

**Teranga Tactics** is a football **tactical analysis module** for sports
journalists and analysts. It turns a recorded match into an analytical surface:
draw on paused video, build telestrations (arrows, circles, lines, player tags),
run offside/defensive-line tools, produce slow-motion tactical breakdowns, and
read a match analysis dashboard (possession, shots, pass accuracy, pressing
intensity, an expected-goals placeholder, and more). Finished analyses can be
exported as clips and **sent to the live broadcast**.

It extends Teranga Broadcast from *production* into *analysis & storytelling* —
the "John Terry whiteboard" experience, software-defined and integrated with the
replay and broadcast pipeline.

## Target users

| Persona | Need |
|---------|------|
| **Sports journalist / pundit** | Explain a phase of play on air with clear visuals |
| **Tactical analyst** | Break down shape, pressing, and offside decisions frame-accurately |
| **Digital editor** | Publish branded tactical clips for web & social |
| **Producer** | Pull a prepared tactical breakdown to air during a broadcast |

## Capabilities (eventual scope)

### A. Telestration — drawing on paused video
- **Draw on a paused frame** pulled from the replay buffer / match recording.
- Primitives: **arrows, circles, lines, player tags, labels** (text).
- **Offside line** and **defensive line** tools (horizontal alignment guides,
  snap-to-pitch perspective where feasible).
- Multi-frame sequences and **slow-motion tactical breakdowns** (annotations that
  persist/animate across a slow-mo clip).
- Player tags can later bind to detected/known players (AI event detection synergy).

### B. Match analysis dashboard
A per-match analytics surface, fed primarily by the **match event spine** plus
manual/assisted tagging:
- **Possession percentage**
- **Shots**, **shots on target**, **corners**
- **Pass accuracy**
- **Duels won**
- **Attacking zones** (left/centre/right, thirds)
- **Pressing intensity** (e.g. PPDA-style metric placeholder)
- **Expected goals (xG)** — **placeholder metric** initially (manual/heuristic;
  a real model is out of scope until data/labels exist)

### C. Output & broadcast integration
- **Export tactical analysis clips** (telestration burned in, optional slow-mo).
- **Send analysis clips to broadcast** — register the clip as an asset and load it
  into the OBS Replay media source (reuses the existing export → broadcast path).

## How it fits the existing architecture

Teranga Tactics is deliberately a **composition of existing planes**, not a new
silo (see [03-system-architecture](./03-system-architecture.md)):

- **Builds on the Replay Engine** ([06-replay-engine](./06-replay-engine.md)):
  paused frames, frame-accurate seeking, and the segmented buffer/clip model are
  reused as the canvas source and the export source. Telestration is an overlay
  layer on top of replay clips.
- **Rides the match event spine** ([08-database-model](./08-database-model.md)):
  the analysis dashboard derives possession/shots/etc. from `match_events` plus
  new tactical tagging — no parallel data world.
- **Reuses overlay rendering**: telestration can render as a canvas/SVG layer,
  conceptually similar to the browser-source overlay pattern, and burn-in for
  export uses the same **FFmpeg export pipeline** as highlights.
- **Reuses "send to broadcast"**: a finished tactical clip becomes an `asset` and
  is pushed to OBS exactly like a replay/highlight clip
  ([07-obs-integration](./07-obs-integration.md)).
- **Tenant-scoped**: all tactical data is `organization_id`-scoped under the same
  RLS model as the rest of the platform.

### Proposed shape (future, not built)
- App: a `features/tactics` area in `apps/web` and an analysis surface route
  (e.g. `/(app)/matches/[matchId]/tactics`). A telestration overlay route may be
  added for broadcast output.
- Package: a future `packages/tactics` for pure telestration geometry (shapes,
  perspective math) and stat-derivation helpers, mirroring how `packages/replay`
  isolates replay math.
- Data (draft, future migration): `tactical_analyses`, `tactical_annotations`
  (shapes/labels per frame/clip), and `match_stats` (or `tactical_stats`) for the
  dashboard metrics. Tactical clips reuse the `assets` table (`type` extended,
  e.g. `tactics_clip`).

> These are **forward-looking notes only**. No tables, packages, or routes are
> created now.

## Dependencies & sequencing

Teranga Tactics depends on capabilities delivered earlier, which is why it is a
**later** module:

1. **Replay Engine** (Phase 1) — frame-accurate clips & paused frames. *Current priority.*
2. **Export pipeline** (Phase 2, Highlight Studio) — FFmpeg burn-in & asset model.
3. **Analytics v1 + richer event tagging** (Phase 3) — the data behind the dashboard.
4. **(Optional) AI event detection** (Phase 3) — auto player tags / auto stats.

Given those, Teranga Tactics is targeted for **Phase 3–4** (see roadmap). It must
**not** displace the Replay Engine or the Auth/Tenant foundation.

## Risks & open questions (preview)
- **Perspective-correct pitch lines** (offside/defensive line) are genuinely hard
  without camera calibration; the first version may offer manual guide lines
  rather than auto-calibrated ones.
- **xG and pressing intensity** need real event/positional data; shipped first as
  **placeholders/heuristics**, clearly labelled as such.
- **Telestration burn-in performance** must reuse the replay export budget, not
  introduce a heavy new render path.
- Scope discipline: this is an **analysis** tool, not a general video editor.

## Out of scope for now
- Any implementation (UI, packages, tables, telestration engine).
- A real xG model.
- Auto camera-calibrated pitch mapping.

See the module's placement in the [Development Roadmap](./09-roadmap.md) and its
architectural context in [System Architecture](./03-system-architecture.md).
