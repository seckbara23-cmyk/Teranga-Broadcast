# 10 — Risks & Technical Challenges

The hard problems, honestly stated, with mitigations. These should shape early
prototyping — prove the riskiest assumptions first.

## 1. Frame-accurate replay on commodity hardware (highest risk)
**Risk:** Software replay may not match dedicated EVS hardware for accuracy,
latency, or smoothness. Cutting/seeking can introduce delay or visual glitches.

**Why hard:** keyframe-aligned cutting vs. frame accuracy, re-encode cost,
slow-mo smoothness, and sub-5-second latency all pull against each other.

**Mitigations:**
- Segmented buffer + interior stream-copy + edge re-encode (see
  [06-replay-engine](./06-replay-engine.md)).
- Force CFR + short keyframe interval on the buffer recording.
- Lean on NVENC; keep re-encodes to the two edge segments only.
- Prototype this *first* (Phase 1, M2) and measure latency/accuracy before
  building UI around it.

## 2. The broadcast must never go down
**Risk:** A platform bug, OBS disconnect, or cloud outage taking the live signal
off air would be catastrophic and unrecoverable in the moment.

**Mitigations:**
- Platform **augments** OBS; OBS holds the actual program/record path. A Teranga
  crash must not stop OBS recording or streaming.
- Agent owns a reconnecting OBS session; loud alarms, never silent failures.
- All operator actions reversible; nothing destructive to the live output.
- Holding/break scene always reachable.

## 3. Connectivity in Senegal (cloud dependence)
**Risk:** Intermittent/limited internet makes a cloud-dependent design fragile;
bulk video egress is impractical.

**Mitigations:**
- **Local-first:** recording, replay, overlays all work offline; cloud syncs
  metadata and re-syncs on reconnect.
- No raw video to the cloud — only selected exports, bandwidth-aware.
- Roadmap includes **self-hosted Supabase / full on-prem** option (Phase 4).
- Overlays consumed locally by OBS (localhost), not dependent on WAN.

## 4. Disk and resource exhaustion
**Risk:** Continuous high-bitrate recording + buffer can fill disks and starve
CPU/GPU, stalling the broadcast.

**Mitigations:**
- Mandatory disk monitoring with early warnings (80/90%) and buffer roll-off.
- Pre-match check verifies space for full match length + buffer.
- NVENC offloads encoding from CPU; document hardware minimums.
- Cap concurrent FFmpeg export jobs; queue rather than overload.

## 5. Time-base / clock synchronization
**Risk:** Events, marks, and recording segments drifting out of sync would make
replays land on the wrong frame and break future multi-camera.

**Mitigations:**
- A single **Agent-owned monotonic timeline clock** is the authority.
- All UI timestamps derive from it; events store `timeline_ms`.
- CFR recording so `frame = time * fps` is exact.
- For multi-camera (later), invest in genlock/clock-sync up front.

## 6. Latency budget for real-time UI
**Risk:** Cloud round-trips for scoreboard/commands could feel laggy on air.

**Mitigations:**
- Split budgets: *state* via Supabase Realtime (≤500 ms OK); *media control*
  local Agent↔OBS (≤100 ms).
- Optimistic UI updates with reconciliation.
- Overlay browser sources subscribe locally; no WAN hop for rendering.

## 7. OBS WebSocket coupling & version drift
**Risk:** Tight coupling to OBS WS v5 and breakage across OBS versions; OBS is a
moving target.

**Mitigations:**
- Isolate all OBS specifics in `packages/obs` behind intent-level methods.
- Pin/qualify supported OBS versions; surface version in health.
- The same intent interface backs future vMix/NDI — no console rewrite.

## 8. Browser-source overlay limitations
**Risk:** Browser sources can be heavy, can desync, or render inconsistently.

**Mitigations:**
- Keep overlays lightweight (CSS/SVG, minimal JS, GPU-friendly animations).
- Per-match signed read-only tokens; reconnecting Realtime subscription.
- Provide a manual "refresh overlay" control and visible heartbeat.

## 9. AI event detection accuracy (later phase)
**Risk:** False positives/negatives erode operator trust; on-air auto-actions are
dangerous.

**Mitigations:**
- AI is **advisory** — produces *candidates* an operator confirms; never
  auto-airs.
- Start narrow (goal/whistle/crowd-spike cues), expand with feedback.
- Keep a human in the loop as a permanent design principle.

## 10. Scope & complexity creep
**Risk:** The full vision (replay, graphics, highlights, archive, AI, analytics,
SDI/NDI/vMix) is large; trying to build it all at once stalls everything.

**Mitigations:**
- Strict MVP ([02-mvp-scope](./02-mvp-scope.md)); defer aggressively.
- Module boundaries over a shared event spine so pieces ship independently.
- Validate each phase on a real RTS match before expanding.

## 11. Team, localization & support realities
**Risk:** French-first UX, on-site operator training, and field support in a live
environment are easy to underinvest in.

**Mitigations:**
- FR-first from day one (not retrofitted); operator-tested keyboard ergonomics.
- Pre-match checklists and loud, clear alarms reduce training burden.
- On-site rehearsal milestones (M4/M5) before any real broadcast.

## 12. Vendor/platform lock-in (Supabase, Vercel)
**Risk:** Deep coupling to managed services conflicts with the on-prem goal.

**Mitigations:**
- Supabase is open-source and self-hostable — keep the schema portable, avoid
  proprietary-only features where avoidable.
- Keep the web app deployable to a plain Node host, not Vercel-only.

---

### Risk priority for early prototyping
1. **Replay accuracy & latency** (prove first).
2. **Never take the broadcast down** (architectural guardrail).
3. **Local-first resilience** (connectivity reality).

Everything else is manageable once these three are proven.
