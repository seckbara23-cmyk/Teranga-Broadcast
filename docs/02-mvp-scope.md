# 02 — MVP Scope

The MVP proves the **core loop**: ingest a live match, mark moments, replay them,
overlay a scoreboard/lower-thirds, and export a clip — reliably, in French, on
commodity hardware.

## MVP thesis

> If a 2-person crew can run a live RTS football match with instant replays, a
> live scoreboard, and a goal clip exported to disk within 60 seconds — on one
> good PC + OBS — the platform's core value is proven.

## In scope (MVP / v1)

### 1. Auth, org & match setup
- Supabase Auth (email/password + magic link).
- Organizations (a TV station) and users with roles: `admin`, `producer`,
  `operator`, `viewer`.
- Create a **Match**: teams, competition, kickoff time, operators assigned.

### 2. OBS connection & control
- Connect to a running OBS instance via OBS WebSocket v5.
- Read/switch scenes, toggle sources, start/stop recording & streaming.
- Health/heartbeat indicator (connected, streaming, recording, dropped frames).

### 3. Replay Engine (single source) — *the headline feature*
- Continuous recording of the program feed (via OBS) to local disk.
- **Mark in / mark out** with frame-accuracy and one-key hotkeys.
- Instant playback of a marked clip (configurable slow-mo: 1.0/0.5/0.25x).
- A "live replay buffer" of the last N minutes always available.
- Save a marked moment as a **clip asset** with metadata.

### 4. Scoreboard + graphics overlay (basic)
- A live, editable scoreboard (teams, score, match clock, period).
- Render overlays as a **browser source** consumed by OBS (transparent web page).
- Basic lower-third (name/role) trigger.
- Operator panel updates the overlay in real time via Supabase Realtime.

### 5. Match event log
- Timeline of events (goal, card, substitution, custom) with timestamps tied to
  the recording timeline.
- Events can spawn a replay mark and/or a scoreboard change.

### 6. Clip export (local)
- Export a marked clip to MP4 via FFmpeg (with optional burned-in branding).
- Save to local disk and register as an asset in Supabase.

### 7. French-first UI
- Full FR localization; EN as secondary.
- Operator-optimized, keyboard-driven, dark theme.

## Explicitly OUT of MVP (deferred)

| Feature | Deferred to |
|---------|-------------|
| AI event detection (auto-goal/card) | Phase 3 |
| Multi-camera / multi-angle replay | Phase 2–3 |
| NDI / Blackmagic / SDI ingest | Phase 3–4 |
| vMix integration | Phase 3 |
| Cloud upload of full match footage | Phase 2 |
| Highlight Studio (timeline editor) | Phase 2 |
| Social platform direct publishing (API) | Phase 2 |
| Advanced analytics dashboards | Phase 3 |
| Multi-tenant billing / SaaS packaging | Phase 4 |
| Template marketplace | Phase 4 |

## MVP architecture constraints

- **Video stays local.** The Replay Engine works on local disk; the cloud holds
  metadata and (later) selected exports.
- **One program feed.** Multi-angle is out; we record the OBS program output.
- **Operator on the same LAN as OBS** (or localhost). Remote control is a
  later concern.

## MVP success criteria (acceptance)

1. Operator connects to OBS and sees live status within 3 seconds.
2. A marked replay plays back on-air in under 5 seconds.
3. Scoreboard score change appears in the OBS overlay in under 500 ms.
4. A goal clip exports to MP4 in under 60 seconds.
5. A full 90-minute match can be recorded without the app crashing or stalling
   the broadcast.
6. The entire flow works in French.

## Hardware target for MVP

- 1 × Windows PC: modern 6+ core CPU, 16 GB+ RAM, dedicated GPU (NVENC), fast
  SSD/NVMe for the record buffer.
- OBS Studio (latest) with WebSocket enabled.
- Capture device feeding the program/camera into OBS.
