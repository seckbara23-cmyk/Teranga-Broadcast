# @teranga/replay

Pure **replay buffer model and clip/frame math** for Teranga Broadcast.

This package holds *logic only* — no disk I/O, no FFmpeg. It models the segmented
ring buffer, converts between time and frames (CFR), and plans frame-accurate cuts
(which interior segments can be stream-copied vs. which edge segments must be
re-encoded). The actual recording and FFmpeg execution live in **`apps/agent`**.

Keeping the math here makes it unit-testable in isolation and reusable by both the
Agent and the console (e.g. to preview a cut).

## Contents (planned)

- Segment index model (`BufferSegment`) and ring-buffer bookkeeping.
- Time ↔ frame conversion helpers.
- Mark → cut-plan computation.
- Slow-motion timing math.

> Status: **placeholder**. Replay logic is intentionally **not implemented yet**
> (foundation only). See [docs/06-replay-engine.md](../../docs/06-replay-engine.md).
