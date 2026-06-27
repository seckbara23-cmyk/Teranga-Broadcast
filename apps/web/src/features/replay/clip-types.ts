/** Phase 6 Instant Replay — clip/segment/archive view types. */

export type ClipStatus = "pending" | "extracting" | "ready" | "error";

export type CameraId = "program" | "cam_a" | "cam_b" | "cam_c";

export const CAMERAS: { id: CameraId; label: string }[] = [
  { id: "program", label: "Program" },
  { id: "cam_a", label: "Caméra A" },
  { id: "cam_b", label: "Caméra B" },
  { id: "cam_c", label: "Caméra C" },
];

export const CLIP_DURATIONS = [5, 10, 15, 20, 30, 60] as const;
export type ClipDuration = (typeof CLIP_DURATIONS)[number];

/** Playback speeds for slow-motion (no interpolation). */
export const PLAYBACK_SPEEDS = [1, 0.75, 0.5, 0.25] as const;
export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number];

export type ReplayClip = {
  id: string;
  matchId: string;
  cameraId: CameraId;
  clipType: string;
  matchClockMs: number | null;
  clockLabel: string | null;
  operatorLabel: string | null;
  durationS: number;
  status: ClipStatus;
  name: string | null;
  clipPath: string | null;
  thumbnailPath: string | null;
  archived: boolean;
  createdAt: string;
};

export type ClipQueueItem = {
  id: string;
  clipId: string | null;
  position: number;
  status: "queued" | "ready" | "replay_later" | "played" | "skipped";
  name: string | null;
  // joined from the clip:
  clip: Pick<
    ReplayClip,
    "cameraId" | "clockLabel" | "durationS" | "status" | "name" | "clipType"
  > | null;
};

export type ArchiveEntry = {
  id: string;
  title: string;
  cameraId: string | null;
  operatorLabel: string | null;
  durationS: number | null;
  clipPath: string | null;
  thumbnailPath: string | null;
  createdAt: string;
};

export type BufferStatus = {
  recording: boolean;
  segmentCount: number;
  oldestSegmentAt: string | null;
  newestSegmentAt: string | null;
  diskBytes: number;
  clipCount: number;
  queueCount: number;
  archiveCount: number;
};

export const QUEUE_STATUS_LABEL: Record<ClipQueueItem["status"], string> = {
  queued: "En file",
  ready: "Prêt",
  replay_later: "Plus tard",
  played: "Diffusé",
  skipped: "Ignoré",
};

export const QUEUE_STATUS_DOT: Record<ClipQueueItem["status"], string> = {
  queued: "status__dot--info",
  ready: "status__dot--ok",
  replay_later: "status__dot--warn",
  played: "status__dot--idle",
  skipped: "status__dot--offline",
};

export function cameraLabel(id: string | null): string {
  return CAMERAS.find((c) => c.id === id)?.label ?? id ?? "—";
}
