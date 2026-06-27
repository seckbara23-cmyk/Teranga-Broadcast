import { createClient } from "@/lib/supabase/server";
import { mapAsset, mapCollection } from "./map";
import type { MediaAsset, MediaCollection } from "./types";

export async function listAssets(orgId: string): Promise<MediaAsset[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("media_assets")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(300);
  return (data ?? []).map(mapAsset);
}

export async function listCollections(orgId: string): Promise<MediaCollection[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("media_collections")
    .select("id, name, kind, created_at, media_collection_items(count)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  return (data ?? []).map(mapCollection);
}

/** Tag names per asset id (for the grid + detail panel). */
export async function listAssetTags(
  orgId: string,
): Promise<Record<string, string[]>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("media_asset_tags")
    .select("asset_id, media_tags(name)")
    .eq("organization_id", orgId);
  const out: Record<string, string[]> = {};
  for (const r of (data ?? []) as any[]) {
    const name = r.media_tags?.name;
    if (!name) continue;
    (out[r.asset_id] ??= []).push(name);
  }
  return out;
}

/** Distinct match options present in the library, for the match filter. */
export async function listAssetMatches(
  orgId: string,
): Promise<{ id: string; title: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("media_assets")
    .select("match_id, matches(title)")
    .eq("organization_id", orgId)
    .not("match_id", "is", null)
    .limit(300);
  const seen = new Map<string, string>();
  for (const r of (data ?? []) as any[]) {
    if (r.match_id && !seen.has(r.match_id)) {
      seen.set(r.match_id, r.matches?.title ?? "Match");
    }
  }
  return [...seen.entries()].map(([id, title]) => ({ id, title }));
}
