import { createClient } from "@/lib/supabase/server";
import type { ReplayMark, ReplayPlaylist, ReplayQueueItem } from "./types";

export async function listMarks(matchId: string): Promise<ReplayMark[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("replay_marks")
    .select(
      "id, type, match_clock_ms, clock_label, source, note, operator_label, created_at",
    )
    .eq("match_id", matchId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(`Failed to load marks: ${error.message}`);
  return (data ?? []).map((r: any) => ({
    id: r.id,
    type: r.type,
    matchClockMs: r.match_clock_ms,
    clockLabel: r.clock_label,
    source: r.source,
    note: r.note,
    operatorLabel: r.operator_label,
    createdAt: r.created_at,
  }));
}

export async function listQueue(matchId: string): Promise<ReplayQueueItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("replay_queue")
    .select(
      "id, mark_id, position, status, replay_marks(type, clock_label, match_clock_ms, operator_label)",
    )
    .eq("match_id", matchId)
    .order("position", { ascending: true });
  if (error) throw new Error(`Failed to load queue: ${error.message}`);
  return (data ?? []).map((r: any) => ({
    id: r.id,
    markId: r.mark_id,
    position: r.position,
    status: r.status,
    type: r.replay_marks?.type ?? "custom",
    clockLabel: r.replay_marks?.clock_label ?? null,
    matchClockMs: r.replay_marks?.match_clock_ms ?? null,
    operatorLabel: r.replay_marks?.operator_label ?? null,
  }));
}

export async function listPlaylists(matchId: string): Promise<ReplayPlaylist[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("replay_playlists")
    .select("id, name, created_at, playlist_items(count)")
    .eq("match_id", matchId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to load playlists: ${error.message}`);
  return (data ?? []).map((r: any) => ({
    id: r.id,
    name: r.name,
    itemCount: r.playlist_items?.[0]?.count ?? 0,
    createdAt: r.created_at,
  }));
}
