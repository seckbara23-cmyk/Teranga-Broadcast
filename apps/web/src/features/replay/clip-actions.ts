"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { resolveTenant } from "@/features/auth/tenant";
import type { CameraId } from "./clip-types";

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

function revalidate(matchId: string) {
  revalidatePath(`/matches/${matchId}/replay`);
}

/**
 * Extract a clip (the MARK action). Creates a `pending` clip stamped with the
 * Production match clock (consumed from context) + camera + duration. The Agent
 * resolves pending clips into native media files and flips status to `ready`.
 */
export async function extractClip(input: {
  matchId: string;
  cameraId: CameraId;
  durationS: number;
  matchClockMs: number | null;
  clockLabel: string | null;
  clipType?: string;
}) {
  const { supabase, orgId, operator, userId } = await ctx();
  const postRoll = Math.min(5, input.durationS);
  const preRoll = Math.max(0, input.durationS - postRoll);

  const { error } = await supabase.from("replay_clips").insert({
    organization_id: orgId,
    match_id: input.matchId,
    camera_id: input.cameraId,
    clip_type: input.clipType ?? "replay",
    match_clock_ms: input.matchClockMs,
    clock_label: input.clockLabel,
    operator_label: operator,
    created_by: userId,
    pre_roll_s: preRoll,
    post_roll_s: postRoll,
    duration_s: input.durationS,
    status: "pending",
  });
  if (error) throw new Error(`Extract failed: ${error.message}`);
  revalidate(input.matchId);
}

async function nextPosition(
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

export async function queueClip(matchId: string, clipId: string, name?: string) {
  const { supabase, orgId } = await ctx();
  const position = await nextPosition(supabase, matchId);
  await supabase.from("replay_queue").insert({
    organization_id: orgId,
    match_id: matchId,
    clip_id: clipId,
    position,
    status: "queued",
    name: name ?? null,
  });
  revalidate(matchId);
}

export async function duplicateQueueItem(itemId: string, matchId: string) {
  const { supabase, orgId } = await ctx();
  const { data: item } = await supabase
    .from("replay_queue")
    .select("clip_id, name")
    .eq("id", itemId)
    .single();
  if (!item) return;
  const position = await nextPosition(supabase, matchId);
  await supabase.from("replay_queue").insert({
    organization_id: orgId,
    match_id: matchId,
    clip_id: item.clip_id,
    name: item.name,
    position,
    status: "queued",
  });
  revalidate(matchId);
}

export async function renameQueueItem(
  itemId: string,
  matchId: string,
  name: string,
) {
  const { supabase } = await ctx();
  await supabase.from("replay_queue").update({ name }).eq("id", itemId);
  revalidate(matchId);
}

export async function deleteQueueItem(itemId: string, matchId: string) {
  const { supabase } = await ctx();
  await supabase.from("replay_queue").delete().eq("id", itemId);
  revalidate(matchId);
}

export async function setQueueItemStatus(
  itemId: string,
  matchId: string,
  status: "queued" | "ready" | "replay_later" | "played" | "skipped",
) {
  const { supabase } = await ctx();
  await supabase.from("replay_queue").update({ status }).eq("id", itemId);
  revalidate(matchId);
}

export async function moveQueueItem(itemId: string, direction: "up" | "down") {
  const { supabase } = await ctx();
  const { data: item } = await supabase
    .from("replay_queue")
    .select("id, match_id, position")
    .eq("id", itemId)
    .single();
  if (!item) return;
  const base = supabase
    .from("replay_queue")
    .select("id, position")
    .eq("match_id", item.match_id);
  const { data: neighbors } =
    direction === "up"
      ? await base.lt("position", item.position).order("position", { ascending: false }).limit(1)
      : await base.gt("position", item.position).order("position", { ascending: true }).limit(1);
  const neighbor = neighbors?.[0];
  if (!neighbor) return;
  await supabase.from("replay_queue").update({ position: neighbor.position }).eq("id", item.id);
  await supabase.from("replay_queue").update({ position: item.position }).eq("id", neighbor.id);
  revalidate(item.match_id);
}

export async function archiveClip(clipId: string, matchId: string) {
  const { supabase, orgId } = await ctx();
  const { data: clip } = await supabase
    .from("replay_clips")
    .select("*")
    .eq("id", clipId)
    .single();
  if (!clip) return;

  const { data: tags } = await supabase
    .from("clip_tags")
    .select("tag")
    .eq("clip_id", clipId);
  const tagText = (tags ?? []).map((t: any) => t.tag).join(" ");
  const title = clip.name || `${clip.clip_type} ${clip.clock_label ?? ""}`.trim();

  await supabase.from("replay_archive").insert({
    organization_id: orgId,
    match_id: matchId,
    clip_id: clipId,
    title,
    camera_id: clip.camera_id,
    operator_label: clip.operator_label,
    duration_s: clip.duration_s,
    clip_path: clip.clip_path,
    thumbnail_path: clip.thumbnail_path,
    search_text: `${title} ${clip.camera_id} ${tagText}`.trim(),
  });
  await supabase.from("replay_clips").update({ archived: true }).eq("id", clipId);
  revalidate(matchId);
}

export async function addClipTag(clipId: string, matchId: string, tag: string) {
  const clean = tag.trim();
  if (!clean) return;
  const { supabase, orgId } = await ctx();
  await supabase
    .from("clip_tags")
    .upsert(
      { organization_id: orgId, clip_id: clipId, tag: clean },
      { onConflict: "clip_id,tag" },
    );
  revalidate(matchId);
}

export async function renameClip(clipId: string, matchId: string, name: string) {
  const { supabase } = await ctx();
  await supabase.from("replay_clips").update({ name }).eq("id", clipId);
  revalidate(matchId);
}

export async function deleteClip(clipId: string, matchId: string) {
  const { supabase } = await ctx();
  await supabase.from("replay_clips").delete().eq("id", clipId);
  revalidate(matchId);
}
