import type { ClockStatus, MatchClockState } from "./types";

/** Regulation end (minutes) for periods that have a running clock. */
export const PERIOD_REGULATION: Partial<Record<ClockStatus, number>> = {
  first_half: 45,
  second_half: 90,
  extra_time: 120,
};

export const PERIOD_BASE: Partial<Record<ClockStatus, number>> = {
  first_half: 0,
  second_half: 45,
  extra_time: 90,
};

/**
 * Absolute match time in ms for the current clock state. `nowMs` is the caller's
 * clock (server time in actions, Date.now() on the client tick). Returns null for
 * statuses with no running clock concept (penalties).
 */
export function computeDisplayMs(
  clock: MatchClockState,
  nowMs: number,
): number | null {
  if (clock.status === "pre_match") return 0;
  if (clock.status === "penalties") return null;

  const base = clock.periodBaseMin * 60_000;
  let live = 0;
  if (clock.running && clock.periodStartedAt) {
    live = Math.max(0, nowMs - Date.parse(clock.periodStartedAt));
  }
  return base + clock.accumulatedMs + live;
}

/** Big clock readout, e.g. "47:12" (mm:ss, tabular). */
export function formatClock(displayMs: number | null): string {
  if (displayMs == null) return "TAB"; // tirs au but
  const totalSec = Math.floor(displayMs / 1000);
  const mm = Math.floor(totalSec / 60);
  const ss = totalSec % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

/** Stoppage minutes past regulation, or 0. */
export function stoppageMinutes(
  displayMs: number | null,
  regulation: number | null,
): number {
  if (displayMs == null || regulation == null) return 0;
  const mm = Math.floor(displayMs / 60_000);
  return Math.max(0, mm - regulation);
}

/**
 * Event-style time label anchored to the clock:
 *  - under regulation → "mm:ss" (e.g. "12:44")
 *  - at/over regulation → "reg+stoppage" (e.g. "45+2")
 *  - penalties → "TAB"
 */
export function eventClockLabel(
  displayMs: number | null,
  regulation: number | null,
): string {
  if (displayMs == null) return "TAB";
  const mm = Math.floor(displayMs / 60_000);
  if (regulation != null && mm >= regulation) {
    return `${regulation}+${mm - regulation}`;
  }
  const ss = Math.floor((displayMs % 60_000) / 1000);
  return `${mm}:${String(ss).padStart(2, "0")}`;
}

/** Short "current half" label for the header, e.g. "45'+2" or "HT". */
export function currentHalfLabel(
  clock: MatchClockState,
  displayMs: number | null,
): string {
  switch (clock.status) {
    case "pre_match":
      return "—";
    case "half_time":
      return "MT";
    case "full_time":
      return "FT";
    case "penalties":
      return "TAB";
    default: {
      if (displayMs == null) return "—";
      const mm = Math.floor(displayMs / 60_000);
      const reg = clock.periodRegulationMin;
      if (reg != null && mm >= reg) return `${reg}'+${mm - reg}`;
      return `${mm + 1}'`; // football convention: 0:30 → "1'"
    }
  }
}
