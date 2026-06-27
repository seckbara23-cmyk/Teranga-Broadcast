"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { mapAsset, mapCollection } from "@/features/media/map";
import type { MediaAsset, MediaCollection } from "@/features/media/types";

export function useMedia(
  orgId: string,
  initialAssets: MediaAsset[],
  initialTags: Record<string, string[]>,
  initialCollections: MediaCollection[],
) {
  const [assets, setAssets] = useState<MediaAsset[]>(initialAssets);
  const [tags, setTags] = useState<Record<string, string[]>>(initialTags);
  const [collections, setCollections] =
    useState<MediaCollection[]>(initialCollections);

  const refetch = useCallback(async () => {
    const supabase = createClient();
    const [a, t, c] = await Promise.all([
      supabase.from("media_assets").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(300),
      supabase.from("media_asset_tags").select("asset_id, media_tags(name)").eq("organization_id", orgId),
      supabase.from("media_collections").select("id, name, kind, created_at, media_collection_items(count)").eq("organization_id", orgId).order("created_at", { ascending: false }),
    ]);
    setAssets((a.data ?? []).map(mapAsset));
    const tagMap: Record<string, string[]> = {};
    for (const r of (t.data ?? []) as any[]) {
      const name = r.media_tags?.name;
      if (name) (tagMap[r.asset_id] ??= []).push(name);
    }
    setTags(tagMap);
    setCollections((c.data ?? []).map(mapCollection));
  }, [orgId]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`media:${orgId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "media_assets", filter: `organization_id=eq.${orgId}` }, () => void refetch())
      .on("postgres_changes", { event: "*", schema: "public", table: "media_asset_tags", filter: `organization_id=eq.${orgId}` }, () => void refetch())
      .on("postgres_changes", { event: "*", schema: "public", table: "media_collection_items", filter: `organization_id=eq.${orgId}` }, () => void refetch())
      .on("postgres_changes", { event: "*", schema: "public", table: "media_collections", filter: `organization_id=eq.${orgId}` }, () => void refetch())
      .subscribe();
    return () => {
      channel.unsubscribe();
    };
  }, [orgId, refetch]);

  return { assets, tags, collections };
}
