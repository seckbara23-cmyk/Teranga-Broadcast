import { createClient } from "@/lib/supabase/server";
import type {
  ArchiveEntry,
  BufferStatus,
  ClipQueueItem,
  ReplayClip,
} from "./clip-types";
import { mapClip, mapQueueItem } from "./clip-map";

export async function listClips(matchId: string): Promise<ReplayClip[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("replay_clips")
    .select("*")
    .eq("match_id", matchId)
    .order("created_at", { ascending: false })
    .limit(100);
  return (data ?? []).map(mapClip);
}

export async function listClipQueue(matchId: string): Promise<ClipQueueItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("replay_queue")
    .select(
      "id, clip_id, position, status, name, replay_clips(camera_id, clock_label, duration_s, status, name, clip_type)",
    )
    .eq("match_id", matchId)
    .not("clip_id", "is", null)
    .order("position", { ascending: true });
  return (data ?? []).map(mapQueueItem);
}

export async function searchArchive(
  orgId: string,
  query: string,
): Promise<ArchiveEntry[]> {
  const supabase = await createClient();
  let q = supabase
    .from("replay_archive")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (query.trim()) {
    const term = `%${query.trim()}%`;
    q = q.or(`title.ilike.${term},search_text.ilike.${term}`);
  }
  const { data } = await q;
  return (data ?? []).map((r: any) => ({
    id: r.id,
    title: r.title,
    cameraId: r.camera_id,
    operatorLabel: r.operator_label,
    durationS: r.duration_s,
    clipPath: r.clip_path,
    thumbnailPath: r.thumbnail_path,
    createdAt: r.created_at,
  }));
}

export async function getBufferStatus(
  matchId: string,
  orgId: string,
): Promise<BufferStatus> {
  const supabase = await createClient();

  const [segOldest, segNewest, segCount, segSize, clipCount, queueCount, archiveCount, obsDevice] =
    await Promise.all([
      supabase.from("replay_segments").select("created_at").eq("organization_id", orgId).order("created_at", { ascending: true }).limit(1).maybeSingle(),
      supabase.from("replay_segments").select("created_at").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("replay_segments").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
      supabase.from("replay_segments").select("size_bytes").eq("organization_id", orgId).limit(1000),
      supabase.from("replay_clips").select("id", { count: "exact", head: true }).eq("match_id", matchId),
      supabase.from("replay_queue").select("id", { count: "exact", head: true }).eq("match_id", matchId).not("clip_id", "is", null),
      supabase.from("replay_archive").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
      supabase.from("agent_devices").select("stats").eq("organization_id", orgId).eq("device_type", "obs").limit(1).maybeSingle(),
    ]);

  const diskBytes = (segSize.data ?? []).reduce(
    (sum: number, r: any) => sum + (r.size_bytes ?? 0),
    0,
  );

  return {
    recording: Boolean((obsDevice.data as any)?.stats?.recording),
    segmentCount: segCount.count ?? 0,
    oldestSegmentAt: (segOldest.data as any)?.created_at ?? null,
    newestSegmentAt: (segNewest.data as any)?.created_at ?? null,
    diskBytes,
    clipCount: clipCount.count ?? 0,
    queueCount: queueCount.count ?? 0,
    archiveCount: archiveCount.count ?? 0,
  };
}
