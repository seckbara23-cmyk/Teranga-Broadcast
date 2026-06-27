"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveTenant } from "@/features/auth/tenant";
import { registerMediaAsset, type MediaAssetType } from "@/features/media/service";
import {
  DEFAULT_COLORS,
  FORMATIONS,
  type AnnotationKind,
  type AnnotationSemantic,
  type AnnotationStyle,
  type FormationName,
  type LayerKind,
  type Point,
} from "./types";

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
  revalidatePath(`/matches/${matchId}/tactics`);
}

const DEFAULT_LAYERS: { name: string; kind: LayerKind }[] = [
  { name: "Joueurs", kind: "players" },
  { name: "Dessins", kind: "arrows" },
  { name: "Notes", kind: "notes" },
];

/** Analyze: snapshot a replay clip's freeze frame into a new session. */
export async function createSessionFromClip(matchId: string, clipId: string) {
  const { supabase, orgId, operator, userId } = await ctx();

  const { data: clip } = await supabase
    .from("replay_clips")
    .select("thumbnail_path, clock_label, match_clock_ms, clip_type")
    .eq("id", clipId)
    .maybeSingle();

  const { data: session, error } = await supabase
    .from("tactical_sessions")
    .insert({
      organization_id: orgId,
      match_id: matchId,
      clip_id: clipId,
      title: `Analyse · ${clip?.clip_type ?? "clip"} ${clip?.clock_label ?? ""}`.trim(),
      freeze_frame_url: clip?.thumbnail_path ?? null,
      clock_label: clip?.clock_label ?? null,
      match_clock_ms: clip?.match_clock_ms ?? null,
      home_color: DEFAULT_COLORS.home,
      away_color: DEFAULT_COLORS.away,
      status: "active",
      operator_label: operator,
      created_by: userId,
    })
    .select("id")
    .single();
  if (error || !session) throw new Error(`Session create failed: ${error?.message}`);

  await seedLayers(supabase, orgId, session.id);
  redirect(`/matches/${matchId}/tactics?session=${session.id}`);
}

/** Start a blank pitch analysis (no clip). */
export async function createBlankSession(matchId: string) {
  const { supabase, orgId, operator, userId } = await ctx();
  const { data: session, error } = await supabase
    .from("tactical_sessions")
    .insert({
      organization_id: orgId,
      match_id: matchId,
      title: "Analyse · terrain",
      status: "active",
      operator_label: operator,
      created_by: userId,
    })
    .select("id")
    .single();
  if (error || !session) throw new Error(`Session create failed: ${error?.message}`);
  await seedLayers(supabase, orgId, session.id);
  redirect(`/matches/${matchId}/tactics?session=${session.id}`);
}

async function seedLayers(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
  sessionId: string,
) {
  await supabase.from("tactical_layers").insert(
    DEFAULT_LAYERS.map((l, i) => ({
      organization_id: orgId,
      session_id: sessionId,
      name: l.name,
      kind: l.kind,
      z_order: i,
    })),
  );
}

export async function createLayer(
  sessionId: string,
  matchId: string,
  name: string,
  kind: LayerKind = "custom",
) {
  const { supabase, orgId } = await ctx();
  const { data: last } = await supabase
    .from("tactical_layers")
    .select("z_order")
    .eq("session_id", sessionId)
    .order("z_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  await supabase.from("tactical_layers").insert({
    organization_id: orgId,
    session_id: sessionId,
    name,
    kind,
    z_order: (last?.z_order ?? -1) + 1,
  });
  revalidate(matchId);
}

export async function updateLayer(
  layerId: string,
  matchId: string,
  patch: { name?: string; visible?: boolean; locked?: boolean },
) {
  const { supabase } = await ctx();
  await supabase.from("tactical_layers").update(patch).eq("id", layerId);
  revalidate(matchId);
}

export async function deleteLayer(layerId: string, matchId: string) {
  const { supabase } = await ctx();
  await supabase.from("tactical_layers").delete().eq("id", layerId);
  revalidate(matchId);
}

export async function clearLayer(layerId: string, matchId: string) {
  const { supabase } = await ctx();
  await supabase.from("tactical_annotations").delete().eq("layer_id", layerId);
  revalidate(matchId);
}

export async function createAnnotation(input: {
  sessionId: string;
  layerId: string;
  matchId: string;
  kind: AnnotationKind;
  geometry: { points: Point[]; text?: string };
  style?: AnnotationStyle;
  semantic?: AnnotationSemantic;
}): Promise<string | null> {
  const { supabase, orgId, operator, userId } = await ctx();
  const { data } = await supabase
    .from("tactical_annotations")
    .insert({
      organization_id: orgId,
      session_id: input.sessionId,
      layer_id: input.layerId,
      kind: input.kind,
      geometry: input.geometry,
      style: input.style ?? {},
      semantic: input.semantic ?? {},
      operator_label: operator,
      created_by: userId,
    })
    .select("id")
    .single();
  return data?.id ?? null;
}

export async function updateAnnotation(
  id: string,
  patch: {
    geometry?: { points: Point[]; text?: string };
    style?: AnnotationStyle;
    semantic?: AnnotationSemantic;
  },
) {
  const { supabase } = await ctx();
  await supabase.from("tactical_annotations").update(patch).eq("id", id);
}

export async function deleteAnnotation(id: string) {
  const { supabase } = await ctx();
  await supabase.from("tactical_annotations").delete().eq("id", id);
}

/** Drop a formation onto a layer as player-marker annotations. */
export async function insertFormation(
  sessionId: string,
  layerId: string,
  matchId: string,
  formation: FormationName,
  team: "home" | "away",
) {
  const { supabase, orgId, operator, userId } = await ctx();
  const positions = FORMATIONS[formation];
  // Mirror away team to the top half so both attack toward the middle.
  const rows = positions.map((p, i) => ({
    organization_id: orgId,
    session_id: sessionId,
    layer_id: layerId,
    kind: "player_marker",
    geometry: {
      points: [team === "home" ? p : { x: 1 - p.x, y: 1 - p.y }],
    },
    style: {},
    semantic: { team, playerNumber: i + 1, concept: "formation", label: formation },
    operator_label: operator,
    created_by: userId,
  }));
  await supabase.from("tactical_annotations").insert(rows);
  revalidate(matchId);
}

export async function updateSessionColors(
  sessionId: string,
  matchId: string,
  home: string,
  away: string,
) {
  const { supabase } = await ctx();
  await supabase
    .from("tactical_sessions")
    .update({ home_color: home, away_color: away })
    .eq("id", sessionId);
  revalidate(matchId);
}

export async function recordExport(
  sessionId: string,
  format: "png" | "pdf" | "svg" | "replay_package" | "presentation_package",
  metadata: Record<string, unknown> = {},
) {
  const { supabase, orgId, operator, userId } = await ctx();
  const { data: exp } = await supabase
    .from("tactical_exports")
    .insert({
      organization_id: orgId,
      session_id: sessionId,
      format,
      status: "ready",
      metadata,
      created_by: userId,
    })
    .select("id")
    .single();

  // Register the export in the Media Engine (cross-engine via the Media API).
  const { data: session } = await supabase
    .from("tactical_sessions")
    .select("match_id, title")
    .eq("id", sessionId)
    .maybeSingle();
  const typeMap: Record<string, MediaAssetType> = {
    svg: "tactical_svg",
    png: "tactical_png",
    pdf: "tactical_pdf",
  };
  await registerMediaAsset(supabase, orgId, {
    matchId: session?.match_id ?? null,
    title: `${session?.title ?? "Analyse"} (${format})`,
    assetType: typeMap[format] ?? "document",
    sourceEngine: "tactics",
    sourceId: exp?.id ?? null,
    operatorLabel: operator,
    metadata: { tactical_session_id: sessionId, format },
  });
}
