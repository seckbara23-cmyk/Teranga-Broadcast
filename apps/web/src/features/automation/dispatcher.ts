import type { createClient } from "@/lib/supabase/server";
// Automation invokes OTHER engines' public APIs — never their tables.
import { showEventGraphic, hideGraphic } from "@/features/graphics/actions";
import type { EventGraphicType } from "@/features/graphics/types";
import { queueLastMark } from "@/features/replay/actions";
import { createCollection, addTag } from "@/features/media/actions";

type DB = Awaited<ReturnType<typeof createClient>>;

export type DispatchContext = { matchId: string | null };

async function log(
  supabase: DB,
  orgId: string,
  execId: string,
  level: "info" | "warn" | "error",
  ref: string,
  message: string,
  metadata: Record<string, unknown> = {},
) {
  await supabase.from("automation_logs").insert({
    organization_id: orgId,
    execution_id: execId,
    level,
    action_ref: ref,
    message,
    metadata,
  });
}

/**
 * ActionDispatcher — maps an automation action to a call on the owning engine's
 * public API. Wired actions invoke real engine services; the rest are logged as
 * dispatched (future engine APIs slot in here without schema changes).
 */
export async function dispatchAction(
  supabase: DB,
  orgId: string,
  execId: string,
  ref: string,
  params: Record<string, any>,
  ctx: DispatchContext,
): Promise<void> {
  switch (ref) {
    case "show_graphic": {
      if (!ctx.matchId) return log(supabase, orgId, execId, "warn", ref, "Aucun match — graphique ignoré");
      await showEventGraphic(ctx.matchId, (params.eventType ?? "goal") as EventGraphicType, params.label ?? "");
      return log(supabase, orgId, execId, "info", ref, "Graphics: showEventGraphic()", params);
    }
    case "hide_graphic": {
      if (!ctx.matchId) return log(supabase, orgId, execId, "warn", ref, "Aucun match — masquage ignoré");
      await hideGraphic(ctx.matchId, params.slot ?? "event");
      return log(supabase, orgId, execId, "info", ref, "Graphics: hideGraphic()", params);
    }
    case "queue_replay": {
      if (!ctx.matchId) return log(supabase, orgId, execId, "warn", ref, "Aucun match — file replay ignorée");
      await queueLastMark(ctx.matchId);
      return log(supabase, orgId, execId, "info", ref, "Replay: queueLastMark()", params);
    }
    case "create_media_collection": {
      await createCollection(params.name ?? "Collection auto", params.kind ?? "custom");
      return log(supabase, orgId, execId, "info", ref, "Media: createCollection()", params);
    }
    case "tag_media_asset": {
      if (!params.assetId) return log(supabase, orgId, execId, "warn", ref, "assetId manquant — tag ignoré");
      await addTag(params.assetId, params.tag ?? "auto");
      return log(supabase, orgId, execId, "info", ref, "Media: addTag()", params);
    }
    case "notify_operator":
    case "display_prompt":
      return log(supabase, orgId, execId, "info", ref, params.message ?? "Notification opérateur", params);
    case "log_event":
      return log(supabase, orgId, execId, "info", ref, params.message ?? "Événement journalisé", params);
    case "move_replay":
    case "start_playlist":
    case "open_tactics_session":
    default:
      return log(supabase, orgId, execId, "info", ref, `Action dispatchée: ${ref} (API moteur à venir)`, params);
  }
}
