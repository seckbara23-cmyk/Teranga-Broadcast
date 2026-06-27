/** Production Engine domain types (Phase 2). */

export type ClockStatus =
  | "pre_match"
  | "first_half"
  | "half_time"
  | "second_half"
  | "extra_time"
  | "penalties"
  | "full_time";

export type MatchClockState = {
  status: ClockStatus;
  running: boolean;
  periodBaseMin: number;
  periodRegulationMin: number | null;
  accumulatedMs: number;
  periodStartedAt: string | null; // ISO
};

export type GoalKind = "normal" | "own" | "penalty" | "shootout";

export type Score = {
  home: number;
  away: number;
  shHome: number; // shootout
  shAway: number;
};

export const EMPTY_SCORE: Score = { home: 0, away: 0, shHome: 0, shAway: 0 };

/** Broadcast labels for each match status. */
export const STATUS_LABEL: Record<ClockStatus, string> = {
  pre_match: "PRE MATCH",
  first_half: "LIVE",
  half_time: "HALF TIME",
  second_half: "SECOND HALF",
  extra_time: "EXTRA TIME",
  penalties: "PENALTIES",
  full_time: "FULL TIME",
};

/** A status is "on air" (live) when the ball is in play or shootout is running. */
export function isLiveStatus(s: ClockStatus): boolean {
  return (
    s === "first_half" ||
    s === "second_half" ||
    s === "extra_time" ||
    s === "penalties"
  );
}

/** Coarse matches.status (Kernel field) derived from the granular clock status. */
export function toMatchStatus(
  s: ClockStatus,
): "scheduled" | "live" | "halftime" | "finished" {
  if (s === "pre_match") return "scheduled";
  if (s === "half_time") return "halftime";
  if (s === "full_time") return "finished";
  return "live";
}
