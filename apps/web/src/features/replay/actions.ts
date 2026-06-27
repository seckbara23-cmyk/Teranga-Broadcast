"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { resolveTenant } from "@/features/auth/tenant";
import type { ReplayMarkType, ReplayQueueStatus } from "./types";

function revalidate(matchId: string) {
  revalidatePath(`/matches/${matchId}/replay`);
}

async function ctx() {
  const tenant = await resolveTenant();
  if (!tenant.currentOrg) throw new Error("No active organization");
  const supabase = await createClient();
  return {
    supabase,
    orgId: tenant.currentOrg.id,
    operator: tenant.user.email,
    userId: tenant.user.id,
  };
}

/**
 * Create a replay mark. The match clock value is CONSUMED from the Production
 * context (passed by the client) — Replay never reads Production's match_clock.
 */
export async function createMark(input: {
  matchId: string;
  type: ReplayMarkType;
  matchClockMs: number | null;
  clockLabel: string | null;
  note?: string | null;
  source?: string;
}) {
  const { supabase, orgId, operator, userId } = await ctx();
  const { error } = await supabase.from("replay_marks").insert({
    organization_id: orgId,
    match_id: input.matchId,
    type: input.type,
    match_clock_ms: input.matchClockMs,
    clock_label: input.clockLabel,
    note: input.note ?? null,
    source: input.source ?? "program",
    operator_label: operator,
    created_by: userId,
  });
  if (error) throw new Error(`Failed to create mark: ${error.message}`);
  revalidate(input.matchId);
}

async function nextQueuePosition(
  supabase: Awaited<ReturnType<typeof createClient>>,
  matchId: string,
): Promise<number> {
  const { data } = await supabase
    .from("replay_queue")
    .select("position")
    .eq("match_id", matchId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.position ?? -1) + 1;
}

export async function queueMark(matchId: string, markId: string) {
  const { supabase, orgId } = await ctx();
  const position = await nextQueuePosition(supabase, matchId);
  const { error } = await supabase.from("replay_queue").insert({
    organization_id: orgId,
    match_id: matchId,
    mark_id: markId,
    position,
  });
  if (error) throw new Error(`Failed to queue mark: ${error.message}`);
  revalidate(matchId);
}

/** Queue the most recent mark not already in the queue. */
export async function queueLastMark(matchId: string) {
  const { supabase, orgId } = await ctx();
  const { data: marks } = await supabase
    .from("replay_marks")
    .select("id")
    .eq("match_id", matchId)
    .order("created_at", { ascending: false })
    .limit(10);
  if (!marks || marks.length === 0) return;

  const { data: queued } = await supabase
    .from("replay_queue")
    .select("mark_id")
    .eq("match_id", matchId);
  const queuedIds = new Set((queued ?? []).map((q: any) => q.mark_id));

  const target = marks.find((m: any) => !queuedIds.has(m.id));
  if (!target) return;

  const position = await nextQueuePosition(supabase, matchId);
  await supabase.from("replay_queue").insert({
    organization_id: orgId,
    match_id: matchId,
    mark_id: target.id,
    position,
  });
  revalidate(matchId);
}

export async function removeQueueItem(itemId: string, matchId: string) {
  const { supabase } = await ctx();
  await supabase.from("replay_queue").delete().eq("id", itemId);
  revalidate(matchId);
}

export async function setQueueStatus(
  itemId: string,
  matchId: string,
  status: ReplayQueueStatus,
) {
  const { supabase } = await ctx();
  await supabase.from("replay_queue").update({ status }).eq("id", itemId);
  revalidate(matchId);
}

export async function moveQueueItem(
  itemId: string,
  direction: "up" | "down",
) {
  const { supabase } = await ctx();
  const { data: item } = await supabase
    .from("replay_queue")
    .select("id, match_id, position")
    .eq("id", itemId)
    .single();
  if (!item) return;

  const query = supabase
    .from("replay_queue")
    .select("id, position")
    .eq("match_id", item.match_id);
  const { data: neighbors } =
    direction === "up"
      ? await query
          .lt("position", item.position)
          .order("position", { ascending: false })
          .limit(1)
      : await query
          .gt("position", item.position)
          .order("position", { ascending: true })
          .limit(1);

  const neighbor = neighbors?.[0];
  if (!neighbor) return;

  await supabase
    .from("replay_queue")
    .update({ position: neighbor.position })
    .eq("id", item.id);
  await supabase
    .from("replay_queue")
    .update({ position: item.position })
    .eq("id", neighbor.id);
  revalidate(item.match_id);
}

// --- Playlists --------------------------------------------------------------

export async function createPlaylist(matchId: string, name: string) {
  const { supabase, orgId } = await ctx();
  const clean = name.trim() || "Nouvelle playlist";
  await supabase
    .from("replay_playlists")
    .insert({ organization_id: orgId, match_id: matchId, name: clean });
  revalidate(matchId);
}

/** Add the most recent mark of the match to a playlist. */
export async function addLastMarkToPlaylist(
  playlistId: string,
  matchId: string,
) {
  const { supabase, orgId } = await ctx();

  const { data: mark } = await supabase
    .from("replay_marks")
    .select("id")
    .eq("match_id", matchId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!mark) return;

  const { data: last } = await supabase
    .from("playlist_items")
    .select("position")
    .eq("playlist_id", playlistId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const position = (last?.position ?? -1) + 1;

  await supabase.from("playlist_items").insert({
    organization_id: orgId,
    playlist_id: playlistId,
    mark_id: mark.id,
    position,
  });
  revalidate(matchId);
}
