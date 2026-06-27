import type { GoalKind, Score } from "./types";
import { EMPTY_SCORE } from "./types";

type GoalLike = {
  type: string;
  team: "home" | "away" | null;
  payload?: { kind?: GoalKind } | null;
};

/**
 * Score is a PROJECTION of goal events on the spine — never a separately-owned
 * table (the future Graphics Engine owns match_state display). Fold goals into a
 * score, handling own goals (credited to the other side) and the shootout.
 */
export function applyGoal(score: Score, ev: GoalLike): Score {
  if (ev.type !== "goal" || !ev.team) return score;
  const kind: GoalKind = ev.payload?.kind ?? "normal";
  const next = { ...score };

  if (kind === "shootout") {
    if (ev.team === "home") next.shHome += 1;
    else next.shAway += 1;
    return next;
  }

  // Own goal credits the opposing team.
  const credited =
    kind === "own" ? (ev.team === "home" ? "away" : "home") : ev.team;
  if (credited === "home") next.home += 1;
  else next.away += 1;
  return next;
}

export function projectScore(events: GoalLike[]): Score {
  return events.reduce(applyGoal, { ...EMPTY_SCORE });
}
