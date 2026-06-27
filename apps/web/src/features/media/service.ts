import type { createClient } from "@/lib/supabase/server";

type DB = Awaited<ReturnType<typeof createClient>>;

export type MediaAssetType =
  | "replay_clip"
  | "thumbnail"
  | "tactical_svg"
  | "tactical_png"
  | "tactical_pdf"
  | "graphics_preset"
  | "graphics_overlay"
  | "match_package"
  | "highlight_package"
  | "document"
  | "image"
  | "video"
  | "audio"
  | "other";

export type SourceEngine =
  | "replay"
  | "tactics"
  | "graphics"
  | "production"
  | "media"
  | "manual";

export type RegisterAssetInput = {
  matchId?: string | null;
  title: string;
  description?: string | null;
  assetType: MediaAssetType;
  sourceEngine: SourceEngine;
  sourceId?: string | null;
  filePath?: string | null;
  thumbnailPath?: string | null;
  durationS?: number | null;
  sizeBytes?: number | null;
  operatorLabel?: string | null;
  metadata?: Record<string, unknown>;
};

/**
 * The Media Engine registration API (ENGINE_SPECIFICATIONS C4). Other engines
 * register their outputs as media assets through this single entry point —
 * idempotent on (organization_id, source_engine, source_id). Media owns the row;
 * the caller only supplies metadata + reference ids.
 */
export async function registerMediaAsset(
  supabase: DB,
  orgId: string,
  input: RegisterAssetInput,
): Promise<void> {
  await supabase.from("media_assets").upsert(
    {
      organization_id: orgId,
      match_id: input.matchId ?? null,
      title: input.title,
      description: input.description ?? null,
      asset_type: input.assetType,
      source_engine: input.sourceEngine,
      source_id: input.sourceId ?? null,
      file_path: input.filePath ?? null,
      thumbnail_path: input.thumbnailPath ?? null,
      duration_s: input.durationS ?? null,
      size_bytes: input.sizeBytes ?? null,
      operator_label: input.operatorLabel ?? null,
      metadata: input.metadata ?? {},
    },
    { onConflict: "organization_id,source_engine,source_id", ignoreDuplicates: false },
  );
}
