# 09 — Development Roadmap

A phased plan from blueprint to a full broadcast platform. Each phase ends with a
**shippable, demonstrable** capability — ideally validated on a real RTS match.

## Phase 0 — Foundations (blueprint → skeleton)
**Goal:** repo, contracts, and a hello-world control loop.

- Monorepo setup (pnpm + Turborepo), strict TS, lint/format, CI.
- `packages/core` command/event contracts + `zod` schemas.
- Supabase project, initial migrations (orgs, profiles, memberships, matches).
- Auth + org/role model; basic console shell (FR/EN i18n, dark theme, shadcn/ui).
- Agent skeleton that connects to OBS and reports status.
- **Exit:** log in, create a match, see live OBS connection status.

## Phase 1 — MVP core loop (the proof)
**Goal:** the full MVP from [02-mvp-scope](./02-mvp-scope.md).

- **Replay Engine v1:** segmented buffer, mark in/out, edge-accurate cut,
  playback to air via OBS media source, save clip asset.
- **Scoreboard + lower-third overlays** as browser sources, Realtime-driven.
- **Match event log** with auto-mark + auto-scoreboard on goal.
- **Clip export** to MP4 (FFmpeg, optional branding) → local + Storage.
- Pre-match checklist + health monitoring.
- **Exit / acceptance:** run a full 90-min RTS match test — replay < 5 s,
  scoreboard < 500 ms, goal clip < 60 s, no crash.

## Phase 2 — Production hardening & digital workflow
**Goal:** make it reliable and useful beyond the live truck.

- Resilience: offline-first sync, reconnect re-assertion, disk roll/alarms.
- **Highlight Studio v1:** timeline of marks/events → assemble a reel → export.
- **Match Archive v1:** post-match assets, events, search/filter.
- Full match cloud upload (optional, bandwidth-aware) + Storage lifecycle.
- Branding/template system for overlays and exports (RTS-branded presets).
- **Social clip export** presets (aspect ratios: 16:9, 1:1, 9:16) — file output
  (direct API publishing later).
- **Exit:** digital editor ships branded social clips during a match; archive is
  searchable next morning.

## Phase 3 — Intelligence & multi-source
**Goal:** automation and richer production.

- **AI event detection:** auto-candidate goals/cards/key moments (operator
  confirms) feeding the event spine and auto-marks.
- **Multi-camera replay:** synchronized buffers, angle selection at playback.
- **NDI ingest** (OBS NDI) for additional cameras/sources.
- **vMix integration** behind the existing `ObsClient` intent interface.
- **Analytics v1:** possession/shots/scoreboard-derived stats, production
  metrics (time-to-replay, clips produced).
- **Exit:** an AI-suggested goal replay accepted by an operator on air;
  two-angle replay.

## Phase 4 — Scale & platform
**Goal:** from one station to a product.

- **Blackmagic DeckLink / SDI** I/O for broadcast-grade ingest/output.
- True **playback deck** (J/K/L shuttle, live speed) via virtual/NDI source.
- Multi-tenant SaaS packaging, billing, org provisioning.
- Self-hosted Supabase / on-prem deployment option (connectivity-independent).
- **Template/overlay marketplace** localized for African competitions.
- Direct **social publishing** integrations (platform APIs).
- **Exit:** a second broadcaster onboarded; productions scale from laptop to
  OB-van.

## Sequencing rationale
- **Replay before everything** — it's the differentiator and the riskiest piece;
  prove it first.
- **Overlays early** — high visible value, low technical risk, reusable browser-
  source pattern.
- **AI and multi-camera later** — they ride on the event spine and timeline that
  Phases 1–2 establish; doing them first would be premature.
- **Hardware I/O (SDI/NDI) last** — highest integration cost, needed only at
  broadcast scale.

## Cross-cutting workstreams (every phase)
- **Localization** (FR-first), accessibility, keyboard ergonomics.
- **Observability**: structured logs, health metrics, error reporting.
- **Testing**: contract tests on `packages/core`, replay-math unit tests, OBS
  integration tests against a real instance, end-to-end match rehearsals.
- **Docs**: keep this `/docs` blueprint current as decisions evolve.

## Suggested first milestones (concrete)
1. M0: Auth + match create + OBS status (Phase 0).
2. M1: Scoreboard overlay live via Realtime (Phase 1, slice).
3. M2: Mark in/out → playback to air (Phase 1, slice).
4. M3: Goal event → auto-mark → 60-second branded export (Phase 1, full loop).
5. M4: First live RTS rehearsal match (Phase 1 exit).
