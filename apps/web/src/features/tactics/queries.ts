import { createClient } from "@/lib/supabase/server";
import { mapAnnotation, mapLayer, mapSession } from "./map";
import type {
  TacticalAnnotation,
  TacticalLayer,
  TacticalSession,
} from "./types";

export async function listSessions(matchId: string): Promise<TacticalSession[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tactical_sessions")
    .select("*")
    .eq("match_id", matchId)
    .order("created_at", { ascending: false });
  return (data ?? []).map(mapSession);
}

export async function getSession(id: string): Promise<TacticalSession | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tactical_sessions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data ? mapSession(data) : null;
}

export async function listLayers(sessionId: string): Promise<TacticalLayer[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tactical_layers")
    .select("*")
    .eq("session_id", sessionId)
    .order("z_order", { ascending: true });
  return (data ?? []).map(mapLayer);
}

export async function listAnnotations(
  sessionId: string,
): Promise<TacticalAnnotation[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tactical_annotations")
    .select("*")
    .eq("session_id", sessionId)
    .order("z_order", { ascending: true });
  return (data ?? []).map(mapAnnotation);
}

/** Tracked event counts for the analysis dashboard (consume Production — read). */
export async function getEventCounts(
  matchId: string,
): Promise<{ cards: number; subs: number }> {
  const supabase = await createClient();
  const [cards, subs] = await Promise.all([
    supabase.from("match_events").select("id", { count: "exact", head: true }).eq("match_id", matchId).eq("type", "card"),
    supabase.from("match_events").select("id", { count: "exact", head: true }).eq("match_id", matchId).eq("type", "substitution"),
  ]);
  return { cards: cards.count ?? 0, subs: subs.count ?? 0 };
}

/** Ready replay clips available to analyze (consume Replay — read only). */
export async function listReadyClips(
  matchId: string,
): Promise<{ id: string; label: string; thumbnailPath: string | null }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("replay_clips")
    .select("id, clock_label, clip_type, thumbnail_path, status")
    .eq("match_id", matchId)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []).map((r: any) => ({
    id: r.id,
    label: `${r.clip_type} ${r.clock_label ?? ""}`.trim(),
    thumbnailPath: r.thumbnail_path,
  }));
}
