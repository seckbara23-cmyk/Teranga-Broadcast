import { createClient } from "@/lib/supabase/server";

export type MatchEventType =
  | "kickoff"
  | "goal"
  | "card"
  | "substitution"
  | "penalty"
  | "period_start"
  | "period_end"
  | "note"
  | "custom";

export type MatchEventRow = {
  id: string;
  type: MatchEventType;
  team: "home" | "away" | null;
  label: string | null;
  timeline_ms: number | null;
  match_clock_ms: number | null;
  created_at: string;
};

export async function listEvents(matchId: string): Promise<MatchEventRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("match_events")
    .select("id, type, team, label, timeline_ms, match_clock_ms, created_at")
    .eq("match_id", matchId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw new Error(`Failed to load events: ${error.message}`);
  return (data ?? []) as MatchEventRow[];
}
