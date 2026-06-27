import type { MediaAsset, MediaCollection } from "./types";

export function mapAsset(r: any): MediaAsset {
  return {
    id: r.id,
    matchId: r.match_id,
    title: r.title,
    description: r.description,
    assetType: r.asset_type,
    sourceEngine: r.source_engine,
    sourceId: r.source_id,
    filePath: r.file_path,
    thumbnailPath: r.thumbnail_path,
    durationS: r.duration_s,
    sizeBytes: r.size_bytes,
    operatorLabel: r.operator_label,
    metadata: r.metadata ?? {},
    createdAt: r.created_at,
  };
}

export function mapCollection(r: any): MediaCollection {
  return {
    id: r.id,
    name: r.name,
    kind: r.kind,
    itemCount: r.media_collection_items?.[0]?.count ?? 0,
    createdAt: r.created_at,
  };
}
