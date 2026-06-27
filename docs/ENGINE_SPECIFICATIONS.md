# Teranga Broadcast — ENGINE SPECIFICATIONS

> **The engineering constitution of the platform.**
> Teranga Broadcast is an **Enterprise Broadcast Technology Platform** — a
> Broadcast OS composed of a kernel and a set of engines.
>
> This document is **normative**. All future code must conform to the engine
> contracts, communication rules, and dependency rules defined here. It is the
> technical companion to [VISION_2030](./VISION_2030.md): VISION_2030 governs
> *principles*; this document governs *engineering*. Where they disagree on a
> matter of principle, VISION_2030 wins; on matters of technical contract, this
> document is authoritative.

- **Status:** Engineering constitution / living document.
- **Supersedes in authority:** all `docs/*` design notes for engine contracts.
- **Amendment rule:** changes require a dated entry in [Amendments](#amendments)
  with rationale.

---

## 0. How to read this document

The platform is **one kernel + seven engines** over a **shared event spine and a
single broadcast timeline**. Each engine below is specified with a fixed template:

1. **Mission** — one sentence; the engine's reason to exist.
2. **Responsibilities** — what it owns end-to-end.
3. **Internal services** — its private sub-components (not callable from outside).
4. **Public APIs** — the *only* ways other engines may invoke it (intent-level).
5. **Events published** — facts it emits to the bus.
6. **Events consumed** — facts it reacts to.
7. **Database ownership** — tables it exclusively owns (writes).
8. **UI ownership** — surfaces it owns in the app.
9. **External integrations** — third-party systems it talks to.
10. **Performance targets** — measurable budgets.
11. **Future roadmap** — where it grows.

### Naming conventions (binding)
- Events: `engine.entity.verb_pastTense` (e.g. `replay.mark.created`).
- Commands/APIs: `engine.verbNoun` (e.g. `replay.playClip`).
- Tables: `snake_case`, prefixed by owning engine domain where useful
  (`tactical_annotations`, `graphics_overlays`), always `organization_id`-scoped.
- All payloads are defined **once** in the shared contract package
  (`packages/core`) and validated (zod) at every boundary.

### Status legend
🟢 current priority · 🟡 planned · 🔵 future

---

## 1. Broadcast Kernel 🟢

> **Mission:** Provide the shared substrate — identity, tenancy, the match/event/
> timeline model, the event bus, and the edge media runtime — that every engine
> runs on.

The Kernel is not "just another engine"; it is the **OS core**. Engines depend on
the Kernel; the Kernel depends on no engine.

**Responsibilities**
- Authentication & session handling; organizations, memberships, roles.
- Tenancy enforcement (Row-Level Security) across all tenant-owned data.
- The canonical **Match**, **Event**, and **Timeline** model (the spine).
- The **event bus** (publish/subscribe) and command transport.
- The **Teranga Agent** runtime contract (edge service that owns OBS, the replay
  buffer, and FFmpeg) and its health/heartbeat protocol.
- The **timeline clock** authority (single monotonic time base per match).
- Shared contract registry (`packages/core` types + zod schemas).

**Internal services**
- `IdentityService` — auth, org/role resolution, tenant resolver.
- `TimelineService` — owns the match recording timeline & time↔frame mapping.
- `EventBusService` — durable + realtime fan-out (see §10–11).
- `AgentRegistry` — agent sessions, heartbeats, capabilities.
- `ContractRegistry` — versioned event/command schemas.

**Public APIs**
- `kernel.resolveTenant()` → current user, memberships, active org.
- `kernel.getMatch(matchId)`, `kernel.getTimeline(matchId)`.
- `kernel.publish(event)`, `kernel.subscribe(topic, handler)`.
- `kernel.now(matchId)` → authoritative timeline ms.
- `kernel.registerAgent(session)` / `kernel.agentHeartbeat(...)`.

**Events published**
- `kernel.match.created` / `kernel.match.updated` / `kernel.match.statusChanged`
- `kernel.timeline.started` (t=0 anchored) / `kernel.timeline.discontinuity`
- `kernel.agent.online` / `kernel.agent.offline` / `kernel.agent.degraded`
- `kernel.org.created` (via `create_organization_with_owner`)

**Events consumed**
- None from engines on the critical path. The Kernel may *observe* engine health
  events for diagnostics but must not depend on any engine to function.

**Database ownership**
- `organizations`, `organization_members`, `venues`, `broadcast_projects`,
  `matches`, `audit_logs`, `agent_sessions`. RLS + the
  `create_organization_with_owner` RPC. (See [08-database-model](./08-database-model.md).)

**UI ownership**
- Auth/login, org switcher, tenant shell, agent/health status surfaces.

**External integrations**
- Supabase (Postgres, Auth, Realtime, Storage). Portable to self-hosted/on-prem.

**Performance targets**
- Tenant resolution < 150 ms (server). Event publish→subscriber delivery: local
  ≤ 100 ms, cloud ≤ 500 ms. Agent heartbeat interval ≤ 5 s; offline detection
  ≤ 15 s.

**Future roadmap**
- Self-hosted/on-prem kernel packaging; multi-region coordination; signed
  short-lived tokens for output surfaces; contract versioning/migration tooling.

---

## 2. Production Engine 🟢

> **Mission:** Own the live show — devices, scenes, recording/streaming state, and
> the live event log — orchestrating OBS (and later vMix/NDI) through intent-level
> contracts.

**Responsibilities**
- Device/session control: connect, scenes, sources, transitions.
- Start/stop recording & streaming; expose broadcast health (dropped frames, FPS,
  disk).
- The **match event log** (goal, card, substitution, period, custom) anchored to
  the timeline.
- Pre-flight checklist orchestration.

**Internal services**
- `DeviceController` (OBS WebSocket session; reconnect/re-assert).
- `ShowStateService` (scene/record/stream state machine).
- `EventLogService` (operator-logged match events).
- `PreflightService` (checklist evaluation).

**Public APIs**
- `production.switchScene(name)`, `production.setSourceVisible(...)`.
- `production.startRecording()` / `stopRecording()` / `startStream()` / `stopStream()`.
- `production.logEvent(matchEvent)`.
- `production.getHealth()`.

**Events published**
- `production.event.logged` (goal/card/etc. — a primary spine event)
- `production.recording.started` / `production.recording.stopped`
- `production.stream.started` / `production.stream.stopped`
- `production.scene.changed`
- `production.health.changed` (dropped frames, disk, encoder)

**Events consumed**
- `kernel.timeline.started` (anchor event timestamps)
- `automation.action.requested` (e.g. switch scene from a showflow)
- `replay.playout.requested` (transition to replay scene)

**Database ownership**
- `match_events`, `match_state` (scoreboard/clock authority is shared with
  Graphics via events — see rules), `production_devices` (future).

**UI ownership**
- Connection/health panel, scene switcher, recording/stream controls, event-log
  surface, pre-flight checklist.

**External integrations**
- OBS WebSocket v5 (now) via the `ObsClient` intent interface; vMix, NDI later
  behind the same contract. (See [07-obs-integration](./07-obs-integration.md).)

**Performance targets**
- Command→device action < 100 ms (local). Reconnect detection < 3 s. Event log
  write→`event.logged` publish < 200 ms.

**Future roadmap**
- vMix/NDI/Blackmagic backends behind `ObsClient`; multi-machine production;
  studio-mode/preview-program transitions; remote production.

---

## 3. Replay Engine 🟢

> **Mission:** Deliver frame-accurate, near-instant replay and slow-motion on
> commodity hardware, and turn any marked moment into a clip asset.

**Responsibilities**
- Continuous **segmented ring buffer** of the program feed (via the Agent).
- Mark in/out, frame-accurate cut planning, slow-motion.
- Playback to air (MVP: OBS media-source swap; later: playback deck).
- Save a marked moment as a `replay_clip` asset.

**Internal services**
- `BufferRecorder` (segmented recording + index).
- `CutPlanner` (interior stream-copy + edge re-encode math — `packages/replay`).
- `PlayoutService` (load clip, speed, return to live).
- `ClipFactory` (produce clip + thumbnail, register asset).

**Public APIs**
- `replay.mark(inMs, outMs, speed)`, `replay.nudgeMark(markId, deltaFrames)`.
- `replay.playClip(markId, { speed })`, `replay.returnToLive()`.
- `replay.saveClip(markId)` → assetId.
- `replay.getBufferWindow(matchId)`.

**Events published**
- `replay.mark.created` / `replay.mark.updated`
- `replay.clip.saved` (assetId)
- `replay.playout.requested` / `replay.playout.started` / `replay.playout.ended`
- `replay.buffer.warning` (disk/segment roll-off)

**Events consumed**
- `production.event.logged` (auto-create a default mark around a goal/card)
- `ai.detection.confirmed` (auto-mark from confirmed AI candidate)
- `kernel.timeline.discontinuity` (clamp/flag affected marks)

**Database ownership**
- `replay_marks`, and `replay_clip` rows in the shared `assets` table (Media
  Engine owns the `assets` table schema; Replay owns rows of its type — see
  asset ownership rule in §10).

**UI ownership**
- Replay deck: buffer scrubber, mark in/out, speed, playback controls, clip list.

**External integrations**
- FFmpeg (via the Agent) for cuts/exports; OBS media source for playout.

**Performance targets**
- Mark → playable clip < 5 s. Playout start < 500 ms after transition. Frame
  accuracy: exact under CFR. Buffer access (any point) effectively O(1) via the
  segment index.

**Future roadmap**
- Multi-camera/multi-angle synchronized buffers; true J/K/L playback deck;
  optical-flow slow-mo (opt-in); NDI/SDI ingest.

---

## 4. Graphics Engine 🟡

> **Mission:** Render real-time, broadcast-quality overlays — scoreboards,
> lower-thirds, tickers — driven by the event spine and composited into the
> program feed.

**Responsibilities**
- Live scoreboard & match clock; lower-thirds; tickers.
- Overlay rendering as transparent **output surfaces** consumed by OBS (browser
  source pattern), authorized by per-match signed tokens.
- Branded/template-driven graphics.

**Internal services**
- `ScoreboardService` (score/clock/period state).
- `OverlayRenderer` (transparent surfaces; realtime subscription).
- `TemplateService` (branding/presets — future).
- `TokenService` (per-match read-only output tokens).

**Public APIs**
- `graphics.updateScoreboard(patch)`, `graphics.setClock(running, ms)`.
- `graphics.showLowerThird(payload)` / `graphics.hide(overlayId)`.
- `graphics.getOutputUrl(kind, matchId)` (signed).

**Events published**
- `graphics.scoreboard.updated`
- `graphics.overlay.shown` / `graphics.overlay.hidden`
- `graphics.clock.changed`

**Events consumed**
- `production.event.logged` (goal → increment score; period change → clock state)
- `automation.action.requested` (showflow-driven graphics)
- `tactics.clip.broadcastRequested` (lower-third context for analysis on air)

**Database ownership**
- `overlays` (config/visibility), and shared authority over `match_state`
  (Graphics is the *render/source-of-display* for scoreboard; Production may also
  mutate via events — conflicts resolved by the single-writer rule in §10).

**UI ownership**
- Scoreboard editor, lower-third triggers, ticker manager, overlay previews; the
  output surface routes (`/overlay/*`).

**External integrations**
- OBS Browser Source (render target). Realtime (Supabase) for live sync.

**Performance targets**
- State change → on-air overlay < 500 ms. Overlay render: lightweight
  (CSS/SVG/canvas, GPU-friendly), 60 fps animations where used.

**Future roadmap**
- Template marketplace (Africa-localised); data-driven & sponsor graphics; 3D/AR
  lower-thirds; multi-language packs.

---

## 5. Tactics Engine 🔵

> **Mission:** Turn recorded match moments into tactical analysis — telestration on
> paused video plus a match analysis dashboard — and push finished analyses to
> broadcast. (See [11-teranga-tactics](./11-teranga-tactics.md).)

**Responsibilities**
- Telestration: arrows, circles, lines, player tags, labels; offside/defensive-
  line tools; slow-mo tactical breakdowns.
- Match analysis dashboard: possession, shots/SoT, corners, pass accuracy, duels,
  attacking zones, pressing intensity, xG **placeholder**.
- Export tactical clips (telestration burned in) and send-to-broadcast.

**Internal services**
- `TelestrationService` (shape/geometry; `packages/tactics` future).
- `AnalysisService` (stat derivation from the event spine + tagging).
- `BreakdownComposer` (multi-frame/slow-mo sequences).
- (Export reuses the Media Engine pipeline — Tactics does **not** own FFmpeg.)

**Public APIs**
- `tactics.createAnalysis(matchId)`, `tactics.addAnnotation(analysisId, shape)`.
- `tactics.getDashboard(matchId)`.
- `tactics.exportClip(analysisId)` → delegates to `media.exportClip(...)`.
- `tactics.sendToBroadcast(assetId)` → emits broadcast request.

**Events published**
- `tactics.analysis.created` / `tactics.annotation.added`
- `tactics.clip.exportRequested` (consumed by Media)
- `tactics.clip.broadcastRequested` (consumed by Replay/Production playout)

**Events consumed**
- `production.event.logged` (feed dashboard stats)
- `replay.clip.saved` (use a replay clip as an analysis source)
- `media.export.ready` (tactical clip finished)
- `ai.tag.suggested` (assisted player tagging — advisory)

**Database ownership**
- `tactical_analyses`, `tactical_annotations`, `tactical_stats`. Tactical clips
  are `tactics_clip` rows in the shared `assets` table.

**UI ownership**
- Analysis surface (telestration canvas over a clip), analysis dashboard.

**External integrations**
- None directly; composes Replay (frames), Media (export), Production (playout).

**Performance targets**
- Telestration interaction < 16 ms/frame (60 fps drawing). Dashboard query
  < 1 s. Tactical-clip export reuses the Media export budget (no new heavy path).

**Future roadmap**
- Perspective-correct pitch calibration (offside lines); positional data ingest;
  real xG model; auto-tagging via AI; collaborative analysis.

---

## 6. Media Engine 🟡

> **Mission:** Own assets end-to-end — highlights, archive, export, and
> distribution — turning every match into a searchable, reusable library the
> broadcaster owns.

**Responsibilities**
- The **asset model** (recordings, clips, exports, thumbnails) and its lifecycle.
- Highlight Studio (assemble reels from marks/events).
- Match Archive (searchable, tagged history).
- Export pipeline (FFmpeg trim + branding burn-in) and distribution (file/social).
- Storage upload/lifecycle (local → Supabase Storage; on-prem option).

**Internal services**
- `AssetRegistry` (owns the `assets` table & status machine).
- `ExportService` (job runner; FFmpeg via the Agent).
- `HighlightStudio` (reel assembly).
- `ArchiveService` (search/tagging).
- `DistributionService` (file/social outputs).

**Public APIs**
- `media.registerAsset(meta)`, `media.getAsset(id)`, `media.queryArchive(filter)`.
- `media.exportClip(spec)` → jobId (used by Replay, Tactics, Highlights).
- `media.createReel(items)`, `media.publish(assetId, target)`.

**Events published**
- `media.asset.registered` / `media.asset.ready` / `media.asset.failed`
- `media.export.requested` / `media.export.ready`
- `media.reel.created`
- `media.published` (distribution target ack)

**Events consumed**
- `replay.clip.saved`, `tactics.clip.exportRequested` (export work)
- `production.recording.stopped` (finalize full recording asset; queue archive)

**Database ownership**
- `assets` (the canonical asset table — single owner), `highlight_reels`,
  `reel_items`, `archive_tags`, `jobs`, `social_publications` (future).
- **Asset rule:** Media owns the `assets` *table*; other engines create rows of
  their type **only via `media.registerAsset` / `media.exportClip`**, never by
  direct insert.

**UI ownership**
- Asset/clip browser, Highlight Studio editor, Match Archive search, export &
  publish dialogs.

**External integrations**
- FFmpeg (via Agent), Supabase Storage, social platform APIs (future).

**Performance targets**
- Goal clip export ready < 60 s. Archive search < 1 s for a season. Upload is
  bandwidth-aware; never blocks the live path.

**Future roadmap**
- Cloud + on-prem storage tiers; direct social publishing; rights/retention
  policies; CDN handoff; cross-match search & smart collections.

---

## 7. Automation Engine 🔵

> **Mission:** Make productions repeatable and low-crew — rundowns, triggers,
> scheduling, and showflows that sequence other engines, always with a human able
> to override on the live path.

**Responsibilities**
- Rundowns/showflows (ordered, conditional sequences of engine actions).
- Event-driven triggers (e.g. `goal → scoreboard + auto-mark + queue clip`).
- Scheduling (timed actions, scheduled productions).
- Macros and templated operations.

**Internal services**
- `RundownService` (ordered showflow execution).
- `TriggerService` (event→action rules).
- `SchedulerService` (time-based actions).
- `ActionDispatcher` (invokes engine Public APIs via commands).

**Public APIs**
- `automation.defineRundown(spec)`, `automation.runStep(rundownId)`.
- `automation.defineTrigger(eventPattern, action)`.
- `automation.schedule(action, at)`.

**Events published**
- `automation.action.requested` (a command other engines consume)
- `automation.rundown.started` / `automation.rundown.stepCompleted`
- `automation.trigger.fired`

**Events consumed**
- Any spine event it has a rule for (e.g. `production.event.logged`,
  `replay.clip.saved`, `ai.detection.confirmed`).

**Database ownership**
- `rundowns`, `rundown_steps`, `automation_triggers`, `schedules` (future).

**UI ownership**
- Rundown builder, trigger/rule editor, schedule manager.

**External integrations**
- None directly — it orchestrates **only** through other engines' Public APIs and
  the event bus (never bypassing an engine to touch its data/devices).

**Performance targets**
- Trigger evaluation latency < 100 ms from event receipt. Showflow step dispatch
  < 100 ms. Must never block a live operator action.

**Future roadmap**
- Visual showflow designer; conditional/branching logic; multi-match scheduling;
  reusable show templates; safe simulation/dry-run mode.

---

## 8. AI Engine 🔵

> **Mission:** Assist — never replace — operators with event detection, auto-mark,
> auto-tagging, and assisted stats. **Advisory only**; nothing reaches air without
> a human able to stop it.

**Responsibilities**
- Event detection (goals, cards, key moments) → *candidates*.
- Auto player/object tagging (for Tactics) → *suggestions*.
- Assisted stats and metric estimation (e.g. xG placeholder model later).
- Confidence scoring and operator confirmation flow.

**Internal services**
- `DetectionService` (candidate generation; cues → events).
- `TaggingService` (player/object suggestions).
- `ConfidenceService` (scoring/thresholds).
- `FeedbackService` (operator confirm/reject → learning loop).

**Public APIs**
- `ai.requestDetection(matchId, window)`.
- `ai.getCandidates(matchId)`, `ai.confirm(candidateId)` / `ai.reject(candidateId)`.

**Events published**
- `ai.detection.suggested` (candidate; advisory)
- `ai.detection.confirmed` / `ai.detection.rejected` (after human action)
- `ai.tag.suggested`

**Events consumed**
- `production.recording.started` (begin observing)
- `replay.clip.saved` (analyze a clip)
- `kernel.timeline.*` (align candidates to the timeline)

**Database ownership**
- `ai_detections` (candidates + confidence + confirmation state),
  `ai_feedback` (future).

**UI ownership**
- Candidate review/confirmation surface; suggestion chips within Replay/Tactics
  (the host engines render; AI provides data).

**External integrations**
- Inference runtime (local/edge preferred for latency & data sovereignty);
  optional cloud models where connectivity allows.

**Performance targets**
- Candidate latency (event → suggestion) target < 10 s. **No autonomous on-air
  action — ever.** False-positive rate tracked and driven down with feedback.

**Future roadmap**
- Broader detection vocabulary; positional/tracking data; real xG model;
  multi-sport models; on-device acceleration.

---

## 9. Engine summary & ownership matrix

| Engine | Status | Owns (tables) | Primary UI | Key external |
|--------|--------|---------------|------------|--------------|
| Kernel | 🟢 | orgs, members, venues, projects, matches, audit, agent_sessions | Auth, tenant shell, health | Supabase |
| Production | 🟢 | match_events, (match_state*), devices | Show control, event log | OBS (vMix/NDI later) |
| Replay | 🟢 | replay_marks, (replay_clip rows) | Replay deck | FFmpeg, OBS |
| Graphics | 🟡 | overlays, (match_state*) | Scoreboard, overlays, `/overlay/*` | OBS browser source |
| Tactics | 🔵 | tactical_analyses, _annotations, _stats | Analysis surface, dashboard | (composes others) |
| Media | 🟡 | assets, highlight_reels, reel_items, archive_tags, jobs | Asset browser, Studio, Archive | FFmpeg, Storage, social |
| Automation | 🔵 | rundowns, triggers, schedules | Rundown/trigger builder | (engine APIs only) |
| AI | 🔵 | ai_detections, ai_feedback | Candidate review | Inference runtime |

`*match_state` is rendered/displayed by Graphics but is governed by the
single-writer rule (§10).

---

## 10. Engine communication rules (binding)

These rules are the heart of the engineering constitution.

- **C1 — Engines communicate only via (a) the event bus or (b) published Public
  APIs.** No engine calls another engine's internal services.
- **C2 — No cross-engine database access.** An engine **never** reads or writes
  another engine's tables directly. Data is shared via events or API responses.
  (Read models/projections are allowed but are built from events, not foreign
  table reads.)
- **C3 — Single-writer per table.** Exactly one engine may write a given table.
  Where display and domain overlap (`match_state`: Production logs the goal,
  Graphics renders the score), the **owning engine** (Graphics for `match_state`)
  performs the write in response to the other's event. No shared write paths.
- **C4 — The `assets` table has one owner (Media).** Other engines create assets
  only through `media.registerAsset` / `media.exportClip`.
- **C5 — Commands vs. events.** *Commands* are directed, may fail, and are
  delivered via Public APIs or the command channel (`automation.action.requested`,
  `replay.playout.requested`). *Events* are facts, fan-out, and are never directed
  at a specific engine.
- **C6 — Contracts are versioned and validated.** Every event/command payload is
  defined in `packages/core` with a zod schema and a version; producers and
  consumers validate at the boundary. Breaking a payload = a new version.
- **C7 — Idempotency & ordering.** Consumers must tolerate at-least-once delivery
  (idempotent handlers) and out-of-order arrival; ordering is established by the
  **timeline**, not by receipt order.
- **C8 — Tenancy is non-negotiable.** Every event/command/row carries
  `organization_id`; cross-tenant flow is impossible by construction (RLS + bus
  partitioning).
- **C9 — Fail in isolation.** An engine error must not crash the bus, the Kernel,
  or the live broadcast. Degrade and report (VISION_2030 R1–R2).
- **C10 — The Kernel is dependency-free of engines.** Engines depend on the
  Kernel; the Kernel never depends on an engine to function.

---

## 11. Event bus architecture

The bus is a **Kernel service**. It carries *events* (facts) and *commands*
(directed requests) with different delivery semantics.

**Topology**
- **Per-match partitioning** keyed by `organization_id` + `matchId`. A subscriber
  only ever sees its tenant's, its match's traffic.
- **Two transports, one logical bus:**
  - **Realtime transport** (Supabase Realtime / broadcast channels) for low-
    latency fan-out of live state and commands.
  - **Durable transport** (Postgres rows: `match_events`, `jobs`, domain tables +
    change feeds) for facts that must survive restarts and re-sync after an
    outage. Critical events are persisted, then broadcast.
- **Local fast path:** Agent↔OBS media control never traverses the cloud bus
  (Invariant I7); it is direct and local.

**Delivery semantics**
- **At-least-once**, unordered. Handlers are **idempotent** (C7).
- **Ordering by timeline**, not arrival: every event carries `timelineMs`.
- **Replayable:** durable events can be re-read to rebuild a projection or recover
  a late-joining/ reconnecting subscriber (supports offline-first, Invariant I1).
- **Backpressure:** consumers may lag; the live path is never blocked waiting on a
  slow consumer (e.g. Media export, AI inference run behind the live loop).

**Envelope (canonical fields)**
`{ id, type, version, organizationId, matchId, timelineMs, occurredAt, actor,
producer, payload }` — defined once in `packages/core`.

**Command channel**
- Commands are directed envelopes (`targetEngine`), may be **rejected** (with a
  reason), and are never silently dropped (VISION_2030 R3).

---

## 12. Broadcast timeline architecture

The **timeline is the backbone** of the whole platform (VISION_2030 Invariant I2).

- **Single authority:** the **Kernel `TimelineService`**, fed by the Agent's
  monotonic recording clock, owns time for a match. There is exactly one timeline
  per match.
- **Unit:** integer **milliseconds** from `t=0` (the moment recording is anchored,
  `kernel.timeline.started`). Wall-clock is derived, never authoritative.
- **Time↔frame:** recordings are **constant-frame-rate (CFR)**; `frame = round(
  timelineMs / 1000 * fps)`. Frame-accuracy depends on this invariant.
- **Everything references the timeline:** `match_events.timeline_ms`,
  `replay_marks.in_ms/out_ms`, buffer segments, telestration frames, AI
  candidates, stats windows. No feature invents a separate clock.
- **Discontinuities are explicit:** if recording stops/gaps, the Agent emits
  `kernel.timeline.discontinuity`; affected marks/clips are flagged/clamped, never
  silently misaligned.
- **Match clock ≠ timeline:** the displayed match clock (Graphics) is a *derived*
  presentation value; the timeline is the engineering source of truth.
- **Multi-camera (future):** additional angle buffers share the **same** timeline
  via clock sync; a mark applies across angles.

---

## 13. Engine lifecycle

Every engine follows the same lifecycle so the platform can start, supervise, and
degrade predictably.

1. **Register** — declares its identity, contracts (events/commands/version), table
   ownership, and dependencies to the Kernel `ContractRegistry`.
2. **Initialize** — acquires resources (DB access scoped by RLS, Agent capability
   handles); must not assume any *other* engine is up.
3. **Subscribe** — binds its event/command handlers (idempotent).
4. **Ready** — passes its own health check; announces readiness. The platform is
   "live-capable" when the **Kernel + Production + Replay** are ready (the current-
   priority core); other engines are optional add-ons.
5. **Run** — serves Public APIs, consumes events, publishes facts. Emits health.
6. **Degrade** — on partial failure, sheds non-critical work, keeps the live path
   intact, and reports (`*.health.changed`). Never takes down the bus/broadcast.
7. **Recover** — on reconnect, re-asserts expected state and **replays durable
   events** to rebuild projections (offline-first recovery).
8. **Shutdown** — drains in-flight commands, flushes durable events, releases
   resources; no half-applied cross-engine state.

**Health & supervision**
- Each engine exposes a heartbeat + health status; the Kernel `AgentRegistry`/
  supervisor tracks them. A crashed engine restarts independently; the broadcast
  continues.

---

## 14. Dependency rules (binding)

The dependency graph is **acyclic and downward**. Higher engines may depend on
lower ones; never the reverse.

```
                         ┌───────────────┐
                         │    Kernel     │   (depends on nothing)
                         └──────┬────────┘
            ┌───────────────────┼───────────────────┐
            ▼                   ▼                    ▼
       Production            Replay              Graphics
            │                   │                    │
            └─────────┬─────────┴──────────┬─────────┘
                      ▼                     ▼
                    Media                 Tactics
                      ▲                     │
                      └─────────┬───────────┘
                                ▼
                          Automation   ◄── orchestrates via APIs/events only
                                ▲
                                │
                               AI       ◄── advisory; feeds others via events
```

- **D1 — Everyone depends on the Kernel; the Kernel depends on no engine** (C10).
- **D2 — No cyclic dependencies.** If two engines seem to need each other, they
  communicate via **events**, not bidirectional API calls.
- **D3 — Allowed direct API dependencies (downward only):**
  - Replay/Tactics/Highlights → **Media** (`registerAsset`/`exportClip`).
  - Tactics → **Replay** (clip/frame source) and **Media** (export).
  - Automation → any engine's **Public API** (it is an orchestrator; it owns no
    domain data of others).
  - Production ↔ Graphics interact via **events only** (single-writer rule).
- **D4 — AI is a leaf producer.** It consumes spine events and publishes advisory
  events; no engine depends on AI to function (graceful absence).
- **D5 — New engines must declare dependencies up front** and may not introduce a
  cycle. A new downward dependency is a design review; a new upward/cyclic
  dependency requires a constitutional amendment.
- **D6 — Removing an engine must be safe.** Because dependencies are downward and
  event-mediated, any 🔵/🟡 engine can be absent and the **core (Kernel +
  Production + Replay)** still runs a broadcast.

---

## Amendments

| Date | Change | Rationale |
|------|--------|-----------|
| 2026-06-27 | Initial engineering constitution established (8 engines, communication/bus/timeline/lifecycle/dependency rules). | Reframe Teranga Broadcast as an Enterprise Broadcast Technology Platform (Broadcast OS) and define the engine contracts all future code must follow. |

---

### Related documents
- [VISION_2030](./VISION_2030.md) · the platform constitution (principles)
- [03-system-architecture](./03-system-architecture.md) · planes & invariants
- [06-replay-engine](./06-replay-engine.md) · Replay Engine design
- [07-obs-integration](./07-obs-integration.md) · Production ↔ device contracts
- [08-database-model](./08-database-model.md) · table ownership detail
- [11-teranga-tactics](./11-teranga-tactics.md) · Tactics Engine spec

> **All future code must follow this constitution.** When designing a feature,
> first identify its **owning engine**, then its **contract** (APIs + events),
> then its **data ownership** — and verify it violates no rule in §10–§14.
