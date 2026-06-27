/**
 * @teranga/replay — replay buffer model and clip/frame math.
 *
 * PLACEHOLDER. Pure logic only (no I/O, no FFmpeg): the segment-index model,
 * time<->frame conversion, and the math that turns an in/out mark into a cut plan
 * (which interior segments to stream-copy, which edge segments to re-encode).
 * The actual recording and FFmpeg execution live in apps/agent.
 *
 * NOTE: replay logic is intentionally NOT implemented yet (foundation only).
 * See docs/06-replay-engine.md.
 */

import type { TimelineMs, Uuid } from "@teranga/types";

/** A short recording segment in the buffer ring. */
export interface BufferSegment {
  id: Uuid;
  index: number;
  path: string;
  startMs: TimelineMs;
  endMs: TimelineMs;
  startFrame: number;
  endFrame: number;
}

/** An operator's in/out selection on the recording timeline. */
export interface ReplayMark {
  id: Uuid;
  matchId: Uuid;
  inMs: TimelineMs;
  outMs: TimelineMs;
  speed: 1 | 0.5 | 0.25;
}

export const TERANGA_REPLAY_PLACEHOLDER = true as const;
