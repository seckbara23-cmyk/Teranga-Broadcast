import { createClient } from "@/lib/supabase/server";

export type MatchStatus =
  | "scheduled"
  | "live"
  | "halftime"
  | "finished"
  | "archived";

export type MatchRow = {
  id: string;
  title: string;
  competition: string | null;
  home_team: string | null;
  away_team: string | null;
  kickoff_at: string | null;
  status: MatchStatus;
  venue: { name: string } | null;
};

/** Matches for the active org (RLS scopes to the tenant). Newest kickoff first. */
export async function listMatches(): Promise<MatchRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .select(
      "id, title, competition, home_team, away_team, kickoff_at, status, venues(name)",
    )
    .order("kickoff_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to load matches: ${error.message}`);

  return (data ?? []).map((row: any) => ({
    id: row.id,
    title: row.title,
    competition: row.competition,
    home_team: row.home_team,
    away_team: row.away_team,
    kickoff_at: row.kickoff_at,
    status: row.status as MatchStatus,
    venue: row.venues ?? null,
  }));
}

/** Lightweight list for the command palette. */
export async function listMatchRefs(): Promise<{ id: string; title: string }[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .select("id, title")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return [];
  return (data ?? []).map((r: any) => ({ id: r.id, title: r.title }));
}

export type MatchDetail = MatchRow & {
  organization_id: string;
  fps: number | null;
  recording_started_at: string | null;
};

export async function getMatch(matchId: string): Promise<MatchDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .select(
      "id, organization_id, title, competition, home_team, away_team, kickoff_at, status, fps, recording_started_at, venues(name)",
    )
    .eq("id", matchId)
    .maybeSingle();

  if (error) throw new Error(`Failed to load match: ${error.message}`);
  if (!data) return null;

  const row = data as any;
  return {
    id: row.id,
    organization_id: row.organization_id,
    title: row.title,
    competition: row.competition,
    home_team: row.home_team,
    away_team: row.away_team,
    kickoff_at: row.kickoff_at,
    status: row.status,
    fps: row.fps,
    recording_started_at: row.recording_started_at,
    venue: row.venues ?? null,
  };
}
