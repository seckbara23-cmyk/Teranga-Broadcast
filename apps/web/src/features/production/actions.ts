"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ClockStatus, MatchClockState } from "./types";
import { toMatchStatus } from "./types";
import {
  PERIOD_BASE,
  PERIOD_REGULATION,
  computeDisplayMs,
  eventClockLabel,
} from "./clock";

type ClockRow = {
  organization_id: string;
  status: ClockStatus;
  running: boolean;
  period_base_min: number;
  period_regulation_min: number | null;
  accumulated_ms: number;
  period_started_at: string | null;
};

function rowToState(row: ClockRow): MatchClockState {
  return {
    status: row.status,
    running: row.running,
    periodBaseMin: row.period_base_min,
    periodRegulationMin: row.period_regulation_min,
    accumulatedMs: Number(row.accumulated_ms),
    periodStartedAt: row.period_started_at,
  };
}

async function loadClock(matchId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("match_clock")
    .select(
      "organization_id, status, running, period_base_min, period_regulation_min, accumulated_ms, period_started_at",
    )
    .eq("match_id", matchId)
    .single();
  if (error || !data) throw new Error("Clock not found — open the match first.");
  return { supabase, row: data as ClockRow };
}

/** Accumulated ms after freezing the live segment (used on pause / period end). */
function frozenAccumulated(row: ClockRow, nowMs: number): number {
  const live =
    row.running && row.period_started_at
      ? Math.max(0, nowMs - Date.parse(row.period_started_at))
      : 0;
  return Number(row.accumulated_ms) + live;
}

async function stampEvent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  args: {
    matchId: string;
    organizationId: string;
    type: string;
    clockState: MatchClockState;
    payload?: Record<string, unknown>;
  },
) {
  const display = computeDisplayMs(args.clockState, Date.now());
  const label = eventClockLabel(display, args.clockState.periodRegulationMin);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.from("match_events").insert({
    organization_id: args.organizationId,
    match_id: args.matchId,
    type: args.type,
    match_clock_ms: display,
    payload: { clock_label: label, ...(args.payload ?? {}) },
    created_by: user?.id ?? null,
  });
}

async function syncMatchStatus(
  supabase: Awaited<ReturnType<typeof createClient>>,
  matchId: string,
  status: ClockStatus,
) {
  await supabase
    .from("matches")
    .update({ status: toMatchStatus(status) })
    .eq("id", matchId);
}

function revalidate(matchId: string) {
  revalidatePath(`/matches/${matchId}`);
  revalidatePath(`/matches/${matchId}/timeline`);
}

// --- Clock transitions ------------------------------------------------------

async function transitionToPeriod(
  matchId: string,
  status: ClockStatus,
  eventType: string,
) {
  const { supabase, row } = await loadClock(matchId);
  const base = PERIOD_BASE[status] ?? 0;
  const reg = PERIOD_REGULATION[status] ?? null;
  const running = status !== "penalties";
  const startedAt = running ? new Date().toISOString() : null;

  await supabase
    .from("match_clock")
    .update({
      status,
      running,
      period_base_min: base,
      period_regulation_min: reg,
      accumulated_ms: 0,
      period_started_at: startedAt,
    })
    .eq("match_id", matchId);

  const newState: MatchClockState = {
    status,
    running,
    periodBaseMin: base,
    periodRegulationMin: reg,
    accumulatedMs: 0,
    periodStartedAt: startedAt,
  };
  await stampEvent(supabase, {
    matchId,
    organizationId: row.organization_id,
    type: eventType,
    clockState: newState,
    payload: { period: status },
  });
  await syncMatchStatus(supabase, matchId, status);
  revalidate(matchId);
}

async function endPeriod(matchId: string, status: ClockStatus) {
  const { supabase, row } = await loadClock(matchId);
  const acc = frozenAccumulated(row, Date.now());

  await supabase
    .from("match_clock")
    .update({ status, running: false, accumulated_ms: acc, period_started_at: null })
    .eq("match_id", matchId);

  const endedState = rowToState({
    ...row,
    status,
    running: false,
    accumulated_ms: acc,
    period_started_at: null,
  });
  await stampEvent(supabase, {
    matchId,
    organizationId: row.organization_id,
    type: "period_end",
    clockState: endedState,
    payload: { period: row.status, to: status },
  });
  await syncMatchStatus(supabase, matchId, status);
  revalidate(matchId);
}

export async function startMatch(matchId: string) {
  await transitionToPeriod(matchId, "first_half", "kickoff");
}
export async function startSecondHalf(matchId: string) {
  await transitionToPeriod(matchId, "second_half", "period_start");
}
export async function startExtraTime(matchId: string) {
  await transitionToPeriod(matchId, "extra_time", "period_start");
}
export async function startPenalties(matchId: string) {
  await transitionToPeriod(matchId, "penalties", "period_start");
}
export async function endFirstHalf(matchId: string) {
  await endPeriod(matchId, "half_time");
}
export async function fullTime(matchId: string) {
  await endPeriod(matchId, "full_time");
}

export async function pauseClock(matchId: string) {
  const { supabase, row } = await loadClock(matchId);
  if (!row.running) return;
  await supabase
    .from("match_clock")
    .update({
      running: false,
      accumulated_ms: frozenAccumulated(row, Date.now()),
      period_started_at: null,
    })
    .eq("match_id", matchId);
  revalidate(matchId);
}

export async function resumeClock(matchId: string) {
  const { supabase, row } = await loadClock(matchId);
  if (row.running) return;
  await supabase
    .from("match_clock")
    .update({ running: true, period_started_at: new Date().toISOString() })
    .eq("match_id", matchId);
  revalidate(matchId);
}
