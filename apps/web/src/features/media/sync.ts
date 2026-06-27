import { createClient } from "@/lib/supabase/server";
import { registerMediaAsset, type MediaAssetType } from "./service";

/**
 * Backfill/idempotently register existing engine outputs as media assets. Media
 * CONSUMES (reads) Replay and Tactics rows here, and writes only media_assets.
 * Safe to call on every Media Library load.
 */
export async function syncMediaAssets(orgId: string): Promise<void> {
  const supabase = await createClient();

  // Replay clips (ready) → media assets.
  const { data: clips } = await supabase
    .from("replay_clips")
    .select("id, match_id, name, clip_type, clock_label, duration_s, clip_path, thumbnail_path, operator_label, status")
    .eq("organization_id", orgId)
    .eq("status", "ready")
    .limit(200);

  for (const c of (clips ?? []) as any[]) {
    await registerMediaAsset(supabase, orgId, {
      matchId: c.match_id,
      title: c.name || `${c.clip_type} ${c.clock_label ?? ""}`.trim() || "Clip",
      assetType: "replay_clip",
      sourceEngine: "replay",
      sourceId: c.id,
      filePath: c.clip_path,
      thumbnailPath: c.thumbnail_path,
      durationS: c.duration_s,
      operatorLabel: c.operator_label,
      metadata: { replay_clip_id: c.id, clock_label: c.clock_label },
    });
  }

  // Tactical exports → media assets.
  const { data: exports } = await supabase
    .from("tactical_exports")
    .select("id, format, path, session_id, metadata, created_at, organization_id, tactical_sessions(match_id, title)")
    .eq("organization_id", orgId)
    .limit(200);

  const TYPE: Record<string, MediaAssetType> = {
    svg: "tactical_svg",
    png: "tactical_png",
    pdf: "tactical_pdf",
  };

  for (const e of (exports ?? []) as any[]) {
    await registerMediaAsset(supabase, orgId, {
      matchId: e.tactical_sessions?.match_id ?? null,
      title: `${e.tactical_sessions?.title ?? "Analyse"} (${e.format})`,
      assetType: TYPE[e.format] ?? "document",
      sourceEngine: "tactics",
      sourceId: e.id,
      filePath: e.path,
      metadata: { tactical_session_id: e.session_id, format: e.format },
    });
  }
}
