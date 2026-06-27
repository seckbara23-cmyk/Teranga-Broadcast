# Teranga Broadcast — VISION 2030

> **The constitution of the platform.**
> Teranga Broadcast is evolving from a replay application into an **Enterprise
> Sports Broadcast Operating System (Broadcast OS)**.
>
> This document is normative, not descriptive. Every future feature, module, and
> architectural decision **must** comply with the principles, standards, and
> boundaries defined here. Where a product document and this constitution
> disagree, **this document wins** until it is formally amended.

- **Document status:** Constitution / living document.
- **Horizon:** 2026 → 2030.
- **Supersedes in authority:** all `docs/*` blueprints for matters of principle.
- **Amendment rule:** changes to this file require an explicit, dated entry in
  the [Amendments](#amendments) log and a stated rationale.

---

## 1. Mission

> **Give every sports broadcaster — starting in Africa — a software-defined
> control room that turns a live match into instant replays, on-air graphics,
> tactical analysis, and shareable stories, with broadcast-grade reliability, on
> commodity hardware they can actually afford.**

Professional sports production has been gated behind million-dollar hardware
trucks, closed ecosystems, and large specialist crews. Teranga Broadcast exists
to **democratise broadcast-grade production** — to make the tools of world-class
sport accessible to national broadcasters, regional stations, and independent
production teams, beginning with **RTS Senegal** and the African market.

The name **Teranga** is the Senegalese (Wolof) value of hospitality and
generosity. The platform is built in that spirit: powerful capability, offered
openly, designed for the realities of the people who use it.

---

## 2. Product philosophy

The platform is governed by ten convictions. These are the "why" behind every
rule that follows.

1. **The broadcast is sacred.** Our software *augments* a live broadcast; it must
   never be the reason a broadcast fails. Failure must always be safe.
2. **Operator-first.** The primary user is a person in a live environment under
   time pressure. Latency, clarity, reversibility, and muscle memory beat feature
   count every time.
3. **Local-first where it counts.** Video and time-critical control live at the
   edge, next to the production. The cloud coordinates metadata, not gigabytes of
   frames. Connectivity is a convenience, never a dependency.
4. **One event spine.** Replay, graphics, tactics, analytics, and automation are
   independent modules over a **single shared timeline and event model**. No
   module invents its own parallel world.
5. **Composable, not monolithic.** Engines are modules with clear contracts. A
   station should be able to adopt one engine and grow into the rest.
6. **Commodity by default, professional by upgrade.** It must run on one good PC.
   It must *also* scale to SDI/NDI multi-camera OB-vans without a rewrite.
7. **Software-defined, hardware-friendly.** We orchestrate proven engines (OBS,
   FFmpeg) and integrate hardware (Blackmagic, NDI, vMix); we do not reinvent
   encoders or switchers.
8. **African realities are first-class.** Intermittent power and connectivity,
   mixed hardware, French-first (then multilingual) UX, and affordability are
   design inputs from line one — not localisation afterthoughts.
9. **Human-in-the-loop AI.** AI proposes; operators dispose. Nothing reaches air
   automatically without a human able to stop it.
10. **Own your data.** Every match becomes a reusable, searchable, portable asset
    belonging to the broadcaster — not locked in a vendor silo.

---

## 3. Product positioning: from app to Operating System

A **Broadcast OS** is not one app. It is a **platform** with:

- a **kernel** — the shared spine: identity & tenancy, the match/event/timeline
  model, the media plane (the edge **Teranga Agent** that owns OBS, the replay
  buffer, and FFmpeg), and the real-time coordination bus;
- a set of **engines** — Replay, Graphics, Tactics, Media, Automation, AI — that
  run *on* the kernel and speak its contracts;
- a **device & integration layer** — OBS today; NDI, vMix, and Blackmagic/SDI
  over time;
- an **app surface** — the operator console and the broadcast output surfaces
  (overlays, replay, telestration).

> **Constitutional rule:** new capability is added as an **engine or a kernel
> service with a defined contract**, never as a tangle wired directly into the UI.

---

## 4. Broadcast engines

The platform is organised as engines over the kernel. Each engine has a single
responsibility, a typed contract, and a clear dependency on the spine.

| Engine | Responsibility | Status |
|--------|----------------|--------|
| **Kernel — Identity & Tenant** | Auth, organizations, roles, RLS tenancy | **Current priority** |
| **Replay Engine** | Frame-accurate capture, marking, slow-mo, playback to air | **Current priority** |
| **Graphics Engine** | Scoreboards, lower-thirds, tickers as broadcast overlays | Planned |
| **Media Engine** | Highlights, archive, asset management, export & distribution | Planned |
| **Tactics Engine** | Telestration + match analysis dashboard ([Teranga Tactics](./11-teranga-tactics.md)) | Future |
| **Automation Engine** | Rundowns, triggers, scheduling, repeatable showflows | Future |
| **AI Engine** | Event detection, auto-mark, auto-tag, assisted stats (advisory) | Future |

**Engine law:**
- Every engine reads/writes through the **shared event spine and timeline**.
- Every engine is **tenant-scoped** (`organization_id`) under Row-Level Security.
- Every cross-process message is defined **once** in the shared contract package
  and validated at the boundary.
- An engine may **fail in isolation** without taking down the broadcast or other
  engines.

> **Current priority is explicit and protected:** the **Replay Engine** and the
> **Auth/Tenant foundation** are the present focus. No future engine may displace
> or destabilise them.

---

## 5. Technical architecture (constitutional invariants)

The detailed design lives in [03-system-architecture](./03-system-architecture.md).
The following are **invariants** — properties no feature may violate.

### Three planes
1. **Control plane** — the web app (operator console + broadcast output surfaces).
   Lightweight; carries commands and metadata, never bulk video.
2. **Media plane** — the **Teranga Agent** + OBS + FFmpeg at the edge. Owns the
   recording, the replay buffer, exports, and device control.
3. **Coordination plane** — Postgres + Realtime + Auth + Storage (Supabase),
   portable from cloud to self-hosted/on-prem.

### Invariants
- **I1 — Media never depends on the cloud.** Recording, replay, and overlays work
  with the WAN down; metadata re-syncs on reconnect.
- **I2 — One time base.** Events, replay marks, telestration, and stats all
  reference milliseconds on a single, Agent-owned match recording timeline.
- **I3 — Metadata flows through the cloud; raw video does not** (until an explicit
  export).
- **I4 — Tenancy is enforced in the database (RLS), not just the UI.** Every
  tenant-owned row is scoped by `organization_id`.
- **I5 — Contracts are the only seam.** Engines and devices integrate behind
  intent-level contracts (e.g. the `ObsClient` interface), so vMix/NDI/Blackmagic
  arrive as new implementations, not rewrites.
- **I6 — Portability is preserved.** No cloud-proprietary-only feature on the
  critical path; schema is the source of truth via versioned migrations.
- **I7 — Latency budgets are split:** state via the cloud (≤ 500 ms acceptable),
  media control local Agent↔OBS (≤ 100 ms target).

> Any proposal that breaks an invariant requires a constitutional amendment, not
> a code review exception.

---

## 6. Long-term roadmap (2026–2030)

Strategic horizon. Detailed, milestone-level planning stays in
[09-roadmap](./09-roadmap.md); this is the multi-year arc.

### 2026 — Foundation & the core loop
- Kernel: monorepo, contracts, **Auth/Tenant foundation**, match/event model.
- **Replay Engine v1** (the differentiator) + Graphics overlays + event log +
  clip export. First **live RTS Senegal** rehearsal and broadcast.
- *Theme: prove the core loop on commodity hardware, in French, reliably.*

### 2027 — Production hardening & the digital newsroom
- Resilience/offline-first hardening; **Media Engine** (Highlight Studio,
  Match Archive, social export); branding/template system.
- *Theme: reliable in the field, and useful beyond the live truck.*

### 2028 — Intelligence, analysis & multi-source
- **AI Engine** (advisory event detection, auto-mark/auto-tag); multi-camera
  replay; **NDI ingest**; **vMix** integration; **Analytics**; **Teranga Tactics**
  foundations (telestration + first dashboard).
- *Theme: from production to analysis and storytelling.*

### 2029 — Broadcast-grade scale & automation
- **Blackmagic/SDI** I/O; true playback deck (J/K/L shuttle); **Automation Engine**
  (rundowns, triggers, scheduled showflows); full **Teranga Tactics**.
- *Theme: OB-van scale and repeatable, low-crew operations.*

### 2030 — The Broadcast OS & ecosystem
- Multi-tenant SaaS + self-hosted/on-prem enterprise tiers; template/overlay
  **marketplace** for African competitions; direct social publishing; multiple
  broadcasters across the continent.
- *Theme: an operating system and ecosystem, not a single product.*

> The roadmap is **sequenced by dependency**: Replay before everything; analysis
> and AI ride on the spine that earlier years establish; hardware I/O last.

---

## 7. Core design principles

Binding rules for every contributor and every feature.

- **P1 — Fail safe, fail loud.** Never silently degrade the broadcast; surface
  problems clearly and keep the live signal intact.
- **P2 — Reversible by default.** Operator actions can be undone; nothing is
  destructive to the live output.
- **P3 — Keyboard-first, latency-aware.** Hot paths are driven by hotkeys and
  measured against explicit latency budgets.
- **P4 — One spine, one timeline.** No feature introduces a competing source of
  truth for time or events.
- **P5 — Contract-first.** Define the typed contract before the implementation;
  validate at every process boundary.
- **P6 — Tenant-isolated.** Default-deny RLS; a tenant can never see another's
  data, by construction.
- **P7 — Local-first, cloud-optional.** Assume the network may vanish mid-match.
- **P8 — Human-in-the-loop for anything on air.** AI and automation are advisory
  on the live path unless a human armed them.
- **P9 — Observable.** Structured logs, health metrics, and error reporting are
  part of "done," not an afterthought.
- **P10 — Localised and accessible.** French-first, multilingual-ready, and
  usable under real field conditions.

---

## 8. Reliability standards

Sports broadcast is unforgiving and live. Reliability is a **product feature**,
not an operational hope.

### Reliability tenets
- **R1 — The platform must never take the live signal down.** OBS holds the
  actual program/record path; a Teranga crash must not stop OBS recording or
  streaming.
- **R2 — Degrade gracefully.** Lose the cloud → keep recording, replaying, and
  overlaying locally. Lose a non-critical engine → the rest keeps running.
- **R3 — Reconnect, re-assert, never silently drop.** Connections retry with
  backoff and re-assert expected state; rejected commands are reported, not lost.
- **R4 — Pre-flight before air.** Every production starts from a checklist (OBS
  health, encoder, disk headroom, overlays, buffer) with loud alarms.
- **R5 — Guard the resources.** Disk, CPU/GPU, and dropped-frame monitoring with
  early warnings and bounded buffers.

### Reliability targets (aspirational, to be measured)
| Dimension | Target |
|-----------|--------|
| Live broadcast continuity (signal up during scheduled air) | ≥ 99.9% |
| Time-to-replay (mark → on air) | < 5 s |
| Scoreboard/state change → on-air overlay | < 500 ms |
| Local media control round-trip (Agent↔OBS) | < 100 ms |
| Goal clip ready for social | < 60 s |
| Recoverable from cloud outage with zero broadcast impact | 100% of matches |

> Targets are commitments to measure and improve against, reviewed each roadmap
> year. A feature that regresses a reliability target is a defect.

---

## 9. African broadcaster focus

Africa is not a market to localise *into* later. It is the **design centre**.

- **Affordability.** Runs on one good commodity PC; scales up only when a station
  chooses to. No mandatory premium hardware to start.
- **Connectivity realities.** Local-first by law (Invariant I1); bandwidth-aware
  sync; self-hosted/on-prem tier for air-gapped or low-connectivity operations.
- **Power realities.** Resilient to interruptions; safe recovery; bounded local
  storage that survives restarts.
- **Language & culture.** **French-first**, multilingual-ready (incl. local
  languages over time); templates, competitions, and graphics localised for
  African leagues (Ligue 1 Senegal first), and beyond football to wrestling
  (*làmb*), athletics, basketball, and studio shows.
- **Skills & crew.** Designed for **small crews**; checklists, sensible defaults,
  and clear alarms reduce the training burden.
- **Sovereignty.** Broadcasters own and can self-host their data and archive.

> **Constitutional rule:** a feature that only works well on fast, always-on,
> high-end infrastructure is **not done** until it degrades gracefully for an
> African field deployment.

---

## 10. Competitive positioning

**Category:** Software-defined **Enterprise Sports Broadcast OS** for commodity
hardware, Africa-first.

| Against… | Their model | Teranga's position |
|----------|-------------|--------------------|
| **Legacy replay/graphics hardware** (EVS, Vizrt/Chyron, dedicated routers) | Expensive, closed, crew-heavy | Software-defined, affordable, integrated, small-crew |
| **Pro software switchers** (vMix, OBS alone) | Powerful but generic; replay/graphics/tactics are bolt-ons or absent | A *coordinated OS* with replay, graphics, tactics, and automation over one spine — and we *integrate* vMix/OBS rather than compete |
| **Cloud production suites** | Assume strong, always-on connectivity | Local-first, cloud-optional; works when the WAN doesn't |
| **Analysis-only tools** (telestration/stats apps) | Disconnected from the live broadcast | Tactics is wired into replay, export, and the on-air path |

**Why we win:** the **combination** — broadcast-grade reliability + an integrated
engine suite + local-first resilience + Africa-first economics — that no single
incumbent offers together. Our moat is the **shared spine** that makes the engines
greater than their sum, plus deep fit for underserved markets.

> We do not win by out-featuring incumbents on any one engine on day one. We win on
> integration, reliability, accessibility, and focus.

---

## 11. Future modules

All modules are engines over the kernel (Section 4) and obey every invariant and
principle above. Current priority — **Replay** and **Auth/Tenant** — is protected.

### Replay (Replay Engine) — *current priority*
Frame-accurate replay on commodity hardware: segmented ring buffer, mark in/out,
slow-motion, playback to air, save-as-clip. The headline differentiator and the
riskiest piece — proven first. See [06-replay-engine](./06-replay-engine.md).
*Future depth:* multi-camera/multi-angle, true J/K/L playback deck, NDI/SDI ingest.

### Graphics (Graphics Engine)
Live scoreboards, lower-thirds, and tickers rendered as broadcast overlays driven
in real time by the event spine. *Future depth:* branded template system,
data-driven graphics, sponsor packages.

### Tactics (Tactics Engine — *future*)
**Teranga Tactics**: telestration on paused replay frames (arrows, circles, lines,
player tags, offside/defensive-line tools, slow-mo breakdowns) plus a match
analysis dashboard (possession, shots, pass accuracy, duels, attacking zones,
pressing intensity, xG placeholder), with tactical-clip export and
send-to-broadcast. Composes replay + event spine + export. See
[11-teranga-tactics](./11-teranga-tactics.md).

### Media (Media Engine)
Highlight Studio, Match Archive, asset management, branded export, and
distribution (file/social). Turns every match into a searchable, reusable asset
library the broadcaster owns.

### Automation (Automation Engine — *future*)
Rundowns, showflows, triggers, and scheduling for repeatable, low-crew operations
— event-driven sequences (e.g. goal → scoreboard + auto-mark + queued clip) and
scheduled productions. Always with a human able to override on the live path.

### AI (AI Engine — *future, advisory*)
Event detection (goals/cards/key moments), auto-mark, auto player-tagging, and
assisted stats. **Advisory only** — produces candidates a human confirms; never
auto-airs. Starts narrow (clear cues) and expands with feedback and labelled data.

---

## 12. Features intentionally excluded

A constitution is defined as much by its boundaries. The following are **out of
scope** — deliberately, to protect focus, reliability, and identity. Excluding
them is a feature.

- **We do not build a video encoder/transcoder from scratch.** We orchestrate OBS
  and FFmpeg.
- **We do not replace the camera/switcher hardware on day one.** We integrate with
  it (OBS now; NDI/vMix/Blackmagic later).
- **We are not a general-purpose video editor.** Highlight Studio and Tactics are
  purpose-built for sports moments, not a timeline NLE.
- **No autonomous, human-out-of-the-loop on-air decisions.** AI/automation never
  put content to air without a human able to stop it (Principle P8).
- **No cloud-only, always-online architecture.** Anything that *requires* strong
  connectivity to run a match is rejected (Invariant I1).
- **No vendor lock-in by design.** No critical-path dependence on proprietary,
  non-portable services; broadcasters can self-host.
- **No bulk raw-video egress to the cloud** as a normal operation (Invariant I3).
- **Not a betting/odds platform, a generic OTT/streaming CDN, or a social network.**
  We are a production & analysis OS; we *feed* those systems, we don't become them.
- **No premium-hardware-only features** that can't degrade for field deployments
  (Section 9).

> Adding anything on this list requires a constitutional amendment with an
> explicit rationale.

---

## 13. Success metrics

How we judge whether the mission is being met. Grouped by horizon. Targets are to
be measured and revised yearly.

### Product & reliability (does it work, live?)
- Live broadcast continuity ≥ 99.9% during scheduled air.
- Time-to-replay < 5 s; state→overlay < 500 ms; goal-clip < 60 s (Section 8).
- Zero broadcasts taken down by the platform.
- 100% of matches recoverable from a cloud outage with no broadcast impact.

### Adoption & impact (does it matter?)
- Live matches produced on Teranga Broadcast per month.
- Crew-size reduction vs. the prior workflow (target: a 2–3 person crew doing what
  needed 6+).
- Clips/highlights/tactical breakdowns shipped per match (and time-to-publish).
- Archive value: % of matches archived and searchable next-day.

### Market & mission (is the mission advancing?)
- Number of broadcasters onboarded (Africa-first), and competitions covered.
- Share of deployments running self-hosted/on-prem (sovereignty signal).
- Cost-to-produce per match vs. legacy hardware baselines.
- Operator satisfaction and retention; reduction in training time.

### Platform health (is it an OS?)
- Engines adopted per deployment (breadth of the suite in real use).
- Stability/contract conformance across engines; mean time to recovery.
- Localisation coverage (languages, localised templates/competitions).

> A metric that is never measured is a wish. Each roadmap year, this section is
> reviewed and concrete numeric targets are set and reported against.

---

## Amendments

This constitution is a living document. Material changes are logged here with a
date and rationale.

| Date | Change | Rationale |
|------|--------|-----------|
| 2026-06-27 | Initial constitution established (VISION 2030). | Evolve Teranga Broadcast from a replay application into an Enterprise Sports Broadcast Operating System; define the principles every future feature must follow. |

---

### Related documents
- [00-overview](./00-overview.md) · platform modules & index
- [01-product-vision](./01-product-vision.md) · product vision
- [03-system-architecture](./03-system-architecture.md) · architecture (invariants live here)
- [06-replay-engine](./06-replay-engine.md) · current-priority engine
- [09-roadmap](./09-roadmap.md) · milestone-level roadmap
- [11-teranga-tactics](./11-teranga-tactics.md) · future Tactics Engine

> **Every future feature must follow this constitution.** When in doubt, re-read
> Sections 7 (principles), 8 (reliability), and 12 (exclusions).
