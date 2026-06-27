"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { resolveTenant } from "@/features/auth/tenant";
import { syncMediaAssets } from "./sync";

async function ctx() {
  const tenant = await resolveTenant();
  if (!tenant.currentOrg) throw new Error("No active organization");
  const supabase = await createClient();
  return { supabase, orgId: tenant.currentOrg.id, userId: tenant.user.id };
}

function revalidate() {
  revalidatePath("/media");
}

/** Manually trigger a re-sync from Replay / Tactics into the library. */
export async function refreshLibrary() {
  const { orgId } = await ctx();
  await syncMediaAssets(orgId);
  revalidate();
}

export async function addTag(assetId: string, tagName: string) {
  const name = tagName.trim();
  if (!name) return;
  const { supabase, orgId } = await ctx();

  const { data: tag } = await supabase
    .from("media_tags")
    .upsert({ organization_id: orgId, name }, { onConflict: "organization_id,name" })
    .select("id")
    .single();
  if (!tag) return;

  await supabase
    .from("media_asset_tags")
    .upsert(
      { organization_id: orgId, asset_id: assetId, tag_id: tag.id },
      { onConflict: "asset_id,tag_id" },
    );
  revalidate();
}

export async function removeTag(assetId: string, tagName: string) {
  const { supabase, orgId } = await ctx();
  const { data: tag } = await supabase
    .from("media_tags")
    .select("id")
    .eq("organization_id", orgId)
    .eq("name", tagName)
    .maybeSingle();
  if (!tag) return;
  await supabase
    .from("media_asset_tags")
    .delete()
    .eq("asset_id", assetId)
    .eq("tag_id", tag.id);
  revalidate();
}

export async function createCollection(name: string, kind: string) {
  const { supabase, orgId } = await ctx();
  await supabase.from("media_collections").insert({
    organization_id: orgId,
    name: name.trim() || "Collection",
    kind,
  });
  revalidate();
}

export async function addToCollection(collectionId: string, assetId: string) {
  const { supabase, orgId } = await ctx();
  const { data: last } = await supabase
    .from("media_collection_items")
    .select("position")
    .eq("collection_id", collectionId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  await supabase.from("media_collection_items").upsert(
    {
      organization_id: orgId,
      collection_id: collectionId,
      asset_id: assetId,
      position: (last?.position ?? -1) + 1,
    },
    { onConflict: "collection_id,asset_id" },
  );
  revalidate();
}

export async function removeFromCollection(collectionId: string, assetId: string) {
  const { supabase } = await ctx();
  await supabase
    .from("media_collection_items")
    .delete()
    .eq("collection_id", collectionId)
    .eq("asset_id", assetId);
  revalidate();
}

export async function updateAssetTitle(assetId: string, title: string) {
  const { supabase } = await ctx();
  await supabase.from("media_assets").update({ title }).eq("id", assetId);
  revalidate();
}
