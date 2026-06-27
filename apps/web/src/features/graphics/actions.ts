"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { resolveTenant } from "@/features/auth/tenant";
import type {
  EventGraphicType,
  GraphicsSlot,
  LowerThirdData,
} from "./types";

async function ctx() {
  const tenant = await resolveTenant();
  if (!tenant.currentOrg) throw new Error("No active organization");
  const supabase = await createClient();
  return { supabase, orgId: tenant.currentOrg.id };
}

function revalidate(matchId: string) {
  revalidatePath(`/matches/${matchId}/graphics`);
}

async function upsertOverlay(
  matchId: string,
  slot: GraphicsSlot,
  visible: boolean,
  payload?: Record<string, unknown>,
) {
  const { supabase, orgId } = await ctx();
  const row: Record<string, unknown> = {
    organization_id: orgId,
    match_id: matchId,
    slot,
    visible,
  };
  if (payload) row.payload = payload;
  const { error } = await supabase
    .from("graphics_overlays")
    .upsert(row, { onConflict: "match_id,slot" });
  if (error) throw new Error(`Graphics update failed: ${error.message}`);
  revalidate(matchId);
}

export async function setScorebugVisible(matchId: string, visible: boolean) {
  await upsertOverlay(matchId, "scorebug", visible);
}

export async function showLowerThird(matchId: string, data: LowerThirdData) {
  await upsertOverlay(matchId, "lower_third", true, data as unknown as Record<string, unknown>);
}

export async function hideGraphic(matchId: string, slot: GraphicsSlot) {
  await upsertOverlay(matchId, slot, false);
}

export async function showEventGraphic(
  matchId: string,
  type: EventGraphicType,
  label: string,
) {
  await upsertOverlay(matchId, "event", true, { type, label });
}

export async function saveInstance(
  matchId: string,
  kind: "lower_third" | "event",
  label: string,
  payload: Record<string, unknown>,
) {
  const { supabase, orgId } = await ctx();
  await supabase.from("graphics_instances").insert({
    organization_id: orgId,
    match_id: matchId,
    kind,
    label: label || "Préréglage",
    payload,
  });
  revalidate(matchId);
}

export async function deleteInstance(id: string, matchId: string) {
  const { supabase } = await ctx();
  await supabase.from("graphics_instances").delete().eq("id", id);
  revalidate(matchId);
}
