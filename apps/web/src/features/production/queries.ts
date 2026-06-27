import { createClient } from "@/lib/supabase/server";
import type { MatchClockState, Score } from "./types";
import { projectScore } from "./score";

function toClockState(row: any): MatchClockState {
  return {
    status: row?.status ?? "pre_match",
    running: row?.running ?? false,
    periodBaseMin: row?.period_base_min ?? 0,
    periodRegulationMin: row?.period_regulation_min ?? null,
    accumulatedMs: Number(row?.accumulated_ms ?? 0),
    periodStartedAt: row?.period_started_at ?? null,
  };
}

const DEFAULT_CLOCK: MatchClockState = {
  status: "pre_match",
  running: false,
  periodBaseMin: 0,
  periodRegulationMin: null,
  accumulatedMs: 0,
  periodStartedAt: null,
};

/** Read the match clock, lazily creating a pre-match row if none exists. */
export async function getOrCreateClock(
  matchId: string,
): Promise<MatchClockState> {
  const supabase = await createClient();

  const existing = await supabase
    .from("match_clock")
    .select("*")
    .eq("match_id", matchId)
    .maybeSingle();

  if (existing.data) return toClockState(existing.data);

  const { data: match } = await supabase
    .from("matches")
    .select("organization_id")
    .eq("id", matchId)
    .single();
  if (!match) return DEFAULT_CLOCK;

  await supabase.from("match_clock").insert({
    match_id: matchId,
    organization_id: (match as { organization_id: string }).organization_id,
  });

  const created = await supabase
    .from("match_clock")
    .select("*")
    .eq("match_id", matchId)
    .maybeSingle();
  return created.data ? toClockState(created.data) : DEFAULT_CLOCK;
}

/** Initial score, projected from goal events on the spine. */
export async function getScore(matchId: string): Promise<Score> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("match_events")
    .select("type, team, payload")
    .eq("match_id", matchId)
    .eq("type", "goal");
  return projectScore((data ?? []) as any[]);
}
