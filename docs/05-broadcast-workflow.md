# 05 — Broadcast Workflow

This document describes how an operator actually runs a live match with Teranga
Broadcast, end to end. It is written from the **operator's point of view** so the
UI and system design stay grounded in real production pressure.

## Roles during a live show

- **Producer/Director** — decides what goes to air, calls replays.
- **Replay Operator** — marks and plays moments (may be the same person on a
  small crew).
- **Graphics Operator** — drives scoreboard and lower-thirds.
- **Digital Editor** — exports clips for social during the match.

> MVP target: one or two people cover all of these via a keyboard-driven console.

## Phase 1 — Pre-match setup (T-60 to T-10 min)

1. **Create / open the match** in the console: teams, competition, kickoff,
   logos, colors.
2. **Start the Agent** on the production PC; it connects to OBS.
3. **Verify OBS health**: connected, correct scenes, capture source live, NVENC
   encoder OK, disk space sufficient for the match length.
4. **Open overlay browser sources** in OBS (scoreboard, lower-third). Confirm
   they render transparently over the program.
5. **Arm recording / replay buffer**: the Agent begins continuous segmented
   recording of the program feed.
6. **Dry run**: change a test score → confirm it appears on the overlay; mark a
   test replay → confirm playback.

### Pre-match checklist (shown in UI)
- [ ] OBS connected
- [ ] Program source live
- [ ] Encoder healthy (NVENC, no dropped frames)
- [ ] Disk has space for full match + buffer
- [ ] Overlays rendering
- [ ] Replay buffer recording
- [ ] Scoreboard reset (0–0, clock 00:00)

## Phase 2 — Live match

The console is split into the operator's live surfaces:

### Replay surface
- A **live buffer scrubber** shows the last N minutes always available.
- **Hotkeys**: `I` = mark in, `O` = mark out, `Enter` = play to air, number keys
  = playback speed (1 / 0.5 / 0.25x).
- The producer says "show the goal" → operator marks in/out around the moment →
  plays it back to air in slow-mo → returns to live.
- Each replay is auto-saved as a clip asset with the event it belongs to.

### Graphics surface
- **Scoreboard**: increment score, manage the match clock (start/stop/adjust),
  set period (1st/2nd half, ET, penalties).
- **Lower-thirds**: pick a player/staff name → trigger on/off.
- **Ticker** (later): scrolling info.
- Every change publishes instantly to the overlay browser source via Realtime.

### Event log surface
- One-tap logging of **goal, card, substitution, penalty, custom**.
- Logging an event can:
  - bump the scoreboard (goal → +1),
  - auto-mark a replay window around the event,
  - flag the moment for the digital editor.
- The event timeline is anchored to the recording timeline (so timestamps map to
  exact frames).

### Typical "goal" sequence (the money moment)
1. Goal scored.
2. Operator taps **Goal** in the event log → scoreboard updates on air; a replay
   window is auto-marked.
3. Producer calls the replay → operator refines in/out, plays slow-mo to air.
4. Digital editor opens the auto-marked clip, exports a branded 20-second MP4.
5. Within ~60 s the goal is on air *and* ready for social — from one tapped event.

## Phase 3 — Half-time / breaks
- Switch OBS to a break/holding scene.
- Review and export accumulated highlight clips.
- Adjust scoreboard for the second half.
- Buffer keeps recording (or pauses by choice).

## Phase 4 — Full-time wrap
1. Stop recording (or stop after a buffer tail).
2. Finalize the match record and event log.
3. Export remaining highlights; queue the full match for archive.
4. The Agent uploads selected exports to Supabase Storage; assets marked `ready`.
5. Match moves to the **Archive** with its events, clips, and metadata intact.

## Failure-handling expectations (designed in)
- **Cloud drops:** recording, replay, and overlays keep working locally; state
  re-syncs on reconnect. The broadcast never depends on the internet.
- **OBS disconnect:** the console shows a loud alarm; the Agent auto-retries the
  WebSocket; recording (if OBS still runs) is unaffected.
- **Disk fills:** early warnings at 80/90%; the buffer can roll oldest segments.
- **Operator error:** replays and scoreboard changes are reversible; nothing is
  destructive to the live signal.

## Latency expectations
| Action | Target |
|--------|--------|
| Scoreboard change → on-air overlay | < 500 ms |
| Mark → replay to air | < 5 s |
| Event tap → scoreboard + auto-mark | < 300 ms |
| Goal clip export ready | < 60 s |
