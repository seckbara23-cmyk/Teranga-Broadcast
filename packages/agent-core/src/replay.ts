/**
 * Replay buffer + extraction model for the Agent (metadata; the media file is
 * produced natively by the device — OBS Replay Buffer this phase, no transcoding).
 */

export const BUFFER_MINUTES = [10, 20, 30, 45, 60, 90, 120] as const;
export type BufferMinutes = (typeof BUFFER_MINUTES)[number];

export const SEGMENT_SECONDS = 10;
export const CLIP_DURATIONS = [5, 10, 15, 20, 30, 60] as const;

export interface ReplayConfig {
  bufferMinutes: number; // rolling window length
  segmentSeconds: number; // segment granularity for the custom segmenter (future)
  defaultClipSeconds: number;
  postRollSeconds: number; // seconds to wait after MARK before saving
}

export const DEFAULT_REPLAY_CONFIG: ReplayConfig = {
  bufferMinutes: 30,
  segmentSeconds: SEGMENT_SECONDS,
  defaultClipSeconds: 15,
  postRollSeconds: 5,
};

export interface SegmentInfo {
  seq: number;
  path: string;
  startedAtMs: number;
  endedAtMs: number;
  durationMs: number;
  sizeBytes: number;
}

export interface ClipExtractionRequest {
  clipId: string;
  cameraId: string;
  durationS: number;
  postRollS: number;
}

/**
 * Rolling segment index for a custom (FFmpeg/SRT/NDI) segmenter — future
 * compatibility. Old segments beyond the window are pruned; their paths are
 * returned so the caller can delete the files.
 */
export class ReplayBuffer {
  private segments: SegmentInfo[] = [];

  constructor(private readonly windowMs: number) {}

  add(seg: SegmentInfo): void {
    this.segments.push(seg);
    this.segments.sort((a, b) => a.seq - b.seq);
  }

  /** Drop segments that ended before the window; returns pruned file paths. */
  prune(nowMs: number): string[] {
    const cutoff = nowMs - this.windowMs;
    const keep: SegmentInfo[] = [];
    const pruned: string[] = [];
    for (const s of this.segments) {
      if (s.endedAtMs < cutoff) pruned.push(s.path);
      else keep.push(s);
    }
    this.segments = keep;
    return pruned;
  }

  list(): SegmentInfo[] {
    return this.segments;
  }
  oldest(): SegmentInfo | null {
    return this.segments[0] ?? null;
  }
  newest(): SegmentInfo | null {
    return this.segments[this.segments.length - 1] ?? null;
  }
  totalBytes(): number {
    return this.segments.reduce((n, s) => n + s.sizeBytes, 0);
  }
}
