import type { MatchClockState, Score } from "@/features/production/types";

/** Graphics Engine domain types (Phase 4). */

export type GraphicsSlot = "scorebug" | "lower_third" | "event";

export type LowerThirdData = {
  name: string;
  role: string;
  stat: string;
  team: "home" | "away" | null;
};

export type EventGraphicType =
  | "goal"
  | "yellow_card"
  | "red_card"
  | "substitution"
  | "var"
  | "halftime"
  | "fulltime";

export type EventGraphicData = {
  type: EventGraphicType;
  label: string;
};

/** Live show/hide state of every graphic for a match. */
export type GraphicsState = {
  scorebug: boolean;
  lowerThird: { visible: boolean; data: LowerThirdData };
  event: { visible: boolean; data: EventGraphicData | null };
};

export const DEFAULT_GRAPHICS_STATE: GraphicsState = {
  scorebug: true,
  lowerThird: {
    visible: false,
    data: { name: "", role: "", stat: "", team: null },
  },
  event: { visible: false, data: null },
};

/** The payload broadcast to the public overlay route. */
export type OverlayPayload = {
  teams: {
    home: string | null;
    away: string | null;
    homeFlag: string | null;
    awayFlag: string | null;
  };
  competition: string | null;
  clock: MatchClockState;
  score: Score;
  graphics: GraphicsState;
};

export const EVENT_GRAPHIC: Record<
  EventGraphicType,
  { title: string; accent: string }
> = {
  goal: { title: "BUT", accent: "var(--accent)" },
  yellow_card: { title: "CARTON JAUNE", accent: "#f5c518" },
  red_card: { title: "CARTON ROUGE", accent: "var(--live)" },
  substitution: { title: "CHANGEMENT", accent: "var(--info)" },
  var: { title: "VAR", accent: "#a855f7" },
  halftime: { title: "MI-TEMPS", accent: "var(--fg-muted)" },
  fulltime: { title: "TEMPS PLEIN", accent: "var(--fg-muted)" },
};

export const REALTIME_OVERLAY_CHANNEL = (matchId: string) =>
  `overlay:${matchId}`;
