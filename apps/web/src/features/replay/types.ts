/** Replay Engine domain types (Phase 3 — metadata only). */

export type ReplayMarkType =
  | "goal"
  | "penalty"
  | "var"
  | "save"
  | "chance"
  | "corner"
  | "free_kick"
  | "card"
  | "substitution"
  | "crowd"
  | "celebration"
  | "custom";

export type ReplayQueueStatus = "queued" | "ready" | "replay_later" | "played";

export type ReplayMark = {
  id: string;
  type: ReplayMarkType;
  matchClockMs: number | null;
  clockLabel: string | null;
  source: string;
  note: string | null;
  operatorLabel: string | null;
  createdAt: string;
};

export type ReplayQueueItem = {
  id: string;
  markId: string;
  position: number;
  status: ReplayQueueStatus;
  // Joined from the mark:
  type: ReplayMarkType;
  clockLabel: string | null;
  matchClockMs: number | null;
  operatorLabel: string | null;
};

export type ReplayPlaylist = {
  id: string;
  name: string;
  itemCount: number;
  createdAt: string;
};

export const MARK_TYPE_LABEL: Record<ReplayMarkType, string> = {
  goal: "But",
  penalty: "Penalty",
  var: "VAR",
  save: "Arrêt",
  chance: "Occasion",
  corner: "Corner",
  free_kick: "Coup franc",
  card: "Carton",
  substitution: "Changement",
  crowd: "Public",
  celebration: "Célébration",
  custom: "Repère",
};

export const MARK_TYPE_ICON: Record<ReplayMarkType, string> = {
  goal: "⚽",
  penalty: "🅿",
  var: "🖥",
  save: "🧤",
  chance: "✨",
  corner: "🚩",
  free_kick: "🎯",
  card: "🟨",
  substitution: "🔄",
  crowd: "👥",
  celebration: "🎉",
  custom: "🔖",
};

export const QUEUE_STATUS_LABEL: Record<ReplayQueueStatus, string> = {
  queued: "En file",
  ready: "Prêt",
  replay_later: "Plus tard",
  played: "Diffusé",
};

export const QUEUE_STATUS_DOT: Record<ReplayQueueStatus, string> = {
  queued: "status__dot--info",
  ready: "status__dot--ok",
  replay_later: "status__dot--warn",
  played: "status__dot--idle",
};
