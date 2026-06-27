import type { ClipQueueItem, ReplayClip } from "./clip-types";

/** Pure row mappers — safe on client and server. */
export function mapClip(r: any): ReplayClip {
  return {
    id: r.id,
    matchId: r.match_id,
    cameraId: r.camera_id,
    clipType: r.clip_type,
    matchClockMs: r.match_clock_ms,
    clockLabel: r.clock_label,
    operatorLabel: r.operator_label,
    durationS: r.duration_s,
    status: r.status,
    name: r.name,
    clipPath: r.clip_path,
    thumbnailPath: r.thumbnail_path,
    archived: r.archived,
    createdAt: r.created_at,
  };
}

export function mapQueueItem(r: any): ClipQueueItem {
  const c = r.replay_clips;
  return {
    id: r.id,
    clipId: r.clip_id,
    position: r.position,
    status: r.status,
    name: r.name,
    clip: c
      ? {
          cameraId: c.camera_id,
          clockLabel: c.clock_label,
          durationS: c.duration_s,
          status: c.status,
          name: c.name,
          clipType: c.clip_type,
        }
      : null,
  };
}
