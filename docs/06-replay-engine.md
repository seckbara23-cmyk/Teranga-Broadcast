# 06 — Replay Engine Design

The Replay Engine is the platform's headline differentiator and the hardest part
to get right. This document specifies how it works.

## Goal

Frame-accurate, near-instant replay of the live program feed, with slow-motion
playback to air and one-step saving of any moment as a clip — on commodity
hardware, without a dedicated EVS server.

## Core concept: a continuous segmented ring buffer

Instead of one giant growing file, the Agent records the program feed as a
**sequence of short segments** (e.g. 2–6 seconds each) into a buffer directory,
maintaining an index of `segment → [startTime, endTime, frameRange]`.

```
buffer/
├── seg_000123.ts   (t=00:41:02.000 → 00:41:06.000)
├── seg_000124.ts   (t=00:41:06.000 → 00:41:10.000)
├── seg_000125.ts   (t=00:41:10.000 → 00:41:14.000)
└── index.json       (segment table with precise timestamps)
```

Why segmented:
- **Instant access** to any point without seeking a huge file.
- **Frame-accurate cuts** by combining whole segments + trimming the edge
  segments with FFmpeg.
- **Ring behavior**: old segments can be pruned to bound disk usage for the live
  buffer, while a parallel full recording is kept for archive.

### Two recordings, one source
1. **Full match recording** — OBS's own recording (continuous, archival quality).
2. **Replay buffer** — segmented recording optimized for fast random access.

The Agent maintains a **monotonic timeline clock** so events, marks, and segments
all share one time base (the "match recording timeline").

## Marking model

A replay is defined by `(matchId, inPoint, outPoint, speed)` where in/out are
timestamps on the recording timeline.

- **Mark In (`I`)** / **Mark Out (`O`)** capture the current buffer time (or a
  scrubbed time).
- **Nudge** in/out by ±1 frame / ±1 second with arrow keys for precision.
- A **default pre-roll/post-roll** (e.g. in = event − 5 s, out = event + 8 s) is
  applied when a replay is auto-created from a match event, then refined by the
  operator.

## Playback to air

Two viable mechanisms; the engine supports both:

1. **OBS media source swap (MVP-friendly)**
   - The Agent cuts the marked clip (fast, stream-copy where possible) to a temp
     file and points an OBS **Media Source** at it on a dedicated "Replay" scene.
   - The producer switches to the Replay scene; the clip plays (at chosen speed),
     then returns to the live scene.
   - Slow-motion via media source playback rate or pre-rendered slow clip.

2. **Direct playback deck (later)**
   - A dedicated playback engine streams frames into OBS via a virtual source /
     NDI, enabling true J/K/L shuttle and live speed control without re-cutting.

> MVP uses mechanism (1): simplest, robust, hardware-light. Mechanism (2) is the
> path to true broadcast-grade shuttle control.

## Slow motion

- Speeds: 1.0x, 0.5x, 0.25x (configurable).
- MVP: FFmpeg re-times the clip (`setpts`) or OBS media source playback rate.
- For smoothness, optical-flow interpolation (FFmpeg `minterpolate`) is an
  optional, GPU-cost-aware enhancement — off by default.

## Frame accuracy

- The recording is constant-frame-rate (CFR) to keep time↔frame mapping exact.
- The Agent stores the source FPS; `frame = round(timeSeconds * fps)`.
- Edge segments are trimmed by frame using FFmpeg with keyframe-aware cutting;
  for true frame accuracy the edge segments are re-encoded, the interior segments
  are stream-copied (fast).
- **Keyframe interval** is set low (e.g. every 1–2 s) on the buffer recording to
  minimize re-encode cost at cut points.

## Saving a clip as an asset

When the operator saves a marked replay:
1. Agent produces the trimmed clip file (interior copy + edge re-encode).
2. Generates a thumbnail (frame at in+small offset) and duration metadata.
3. Registers an `asset` row (type `replay_clip`) linked to the match + event.
4. Optionally queues an **export** (branded MP4) for social.

## Data structures (draft)

```ts
// packages/replay
type BufferSegment = {
  id: string;
  index: number;
  path: string;
  startMs: number;   // ms on the recording timeline
  endMs: number;
  startFrame: number;
  endFrame: number;
};

type ReplayMark = {
  id: string;
  matchId: string;
  eventId?: string;
  inMs: number;
  outMs: number;
  speed: 1 | 0.5 | 0.25;
  createdBy: string;
};

type ClipJob = {
  id: string;
  markId: string;
  status: 'queued' | 'cutting' | 'ready' | 'error';
  outputPath?: string;
  brandingPreset?: string;
};
```

## Performance & resource budget

- **Disk:** NVMe strongly recommended; buffer + full recording can be tens of
  GB/hour at broadcast bitrates. Disk monitoring is mandatory.
- **CPU/GPU:** rely on **NVENC** for OBS encoding; FFmpeg edge re-encodes are
  short. Avoid full-clip re-encodes on the hot path.
- **Latency:** mark → playable clip target < 5 s, achieved by stream-copying
  interior segments and only re-encoding the two edges.

## Multi-camera (future)
- Each camera/angle becomes its own synchronized buffer with a shared timeline.
- A replay mark applies across angles; the operator chooses the angle (or cuts
  between angles) at playback — the EVS-style multi-angle experience.
- Requires NDI/SDI ingest (see OBS/ingest roadmap) and tight clock sync.

## Edge cases to handle
- Variable frame rate sources → force CFR on ingest.
- OBS recording stops mid-match → Agent detects gap, marks the buffer
  discontinuity, alerts the operator.
- Marks crossing a pruned (rolled-off) segment → clamp to available buffer +
  warn.
- Clock drift between event log and recording → single Agent-owned clock is the
  authority; UI timestamps derive from it.

## Why this design
It delivers EVS-like behavior with **software + commodity GPU**: instant access
from segmentation, frame accuracy from CFR + edge re-encode, and a clean upgrade
path to true shuttle and multi-angle without changing the data model.
