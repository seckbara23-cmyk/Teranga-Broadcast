import type {
  TacticalAnnotation,
  TacticalLayer,
  TacticalSession,
} from "./types";

/** Pure row mappers — safe on client and server. */
export function mapSession(r: any): TacticalSession {
  return {
    id: r.id,
    matchId: r.match_id,
    clipId: r.clip_id,
    title: r.title,
    freezeFrameUrl: r.freeze_frame_url,
    clockLabel: r.clock_label,
    homeColor: r.home_color,
    awayColor: r.away_color,
    status: r.status,
    createdAt: r.created_at,
  };
}

export function mapLayer(r: any): TacticalLayer {
  return {
    id: r.id,
    name: r.name,
    kind: r.kind,
    visible: r.visible,
    locked: r.locked,
    zOrder: r.z_order,
  };
}

export function mapAnnotation(r: any): TacticalAnnotation {
  return {
    id: r.id,
    layerId: r.layer_id,
    kind: r.kind,
    geometry: r.geometry ?? { points: [] },
    style: r.style ?? {},
    semantic: r.semantic ?? {},
    zOrder: r.z_order,
  };
}
