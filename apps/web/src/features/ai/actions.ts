"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { resolveTenant } from "@/features/auth/tenant";
import { getProvider } from "./provider";
import { buildContext } from "./context";
import { generateRecommendations, buildMatchSummary, buildBroadcastReport } from "./reasoning";
import { getOrCreateConversation } from "./queries";
// Task execution calls engine PUBLIC APIs (only on explicit operator approval).
import { createCollection, addTag } from "@/features/media/actions";

async function ctx() {
  const tenant = await resolveTenant();
  if (!tenant.currentOrg) throw new Error("No active organization");
  const supabase = await createClient();
  return { supabase, orgId: tenant.currentOrg.id, operator: tenant.user.email, userId: tenant.user.id };
}

type DB = Awaited<ReturnType<typeof createClient>>;

async function respond(
  supabase: DB,
  orgId: string,
  userId: string,
  conversationId: string,
  matchId: string | null,
  question: string,
): Promise<string> {
  await supabase.from("ai_messages").insert({ organization_id: orgId, conversation_id: conversationId, role: "user", content: question });

  const context = await buildContext(orgId, matchId);
  const answer = await getProvider().answer(question, context);

  await supabase.from("ai_messages").insert({ organization_id: orgId, conversation_id: conversationId, role: "assistant", content: answer.content, metadata: { hasTask: Boolean(answer.task) } });

  if (answer.task) {
    await supabase.from("ai_tasks").insert({
      organization_id: orgId,
      match_id: matchId,
      kind: answer.task.kind,
      title: answer.task.title,
      params: answer.task.params,
      status: "draft",
      created_by: userId,
    });
  }

  await supabase.from("ai_context_snapshots").insert({ organization_id: orgId, match_id: matchId, conversation_id: conversationId, context: context as unknown as Record<string, unknown> });

  return answer.content;
}

export async function sendMessage(
  conversationId: string,
  matchId: string | null,
  question: string,
) {
  const { supabase, orgId, userId } = await ctx();
  if (question.trim()) await respond(supabase, orgId, userId, conversationId, matchId, question.trim());
  revalidatePath("/ai");
}

/** Workspace-aware quick ask from the persistent panel; returns the answer. */
export async function quickAsk(
  workspace: string,
  matchId: string | null,
  question: string,
): Promise<string> {
  const { supabase, orgId, userId } = await ctx();
  if (!question.trim()) return "";
  const convId = await getOrCreateConversation(orgId, workspace, matchId, userId);
  const answer = await respond(supabase, orgId, userId, convId, matchId, question.trim());
  revalidatePath("/ai");
  return answer;
}

export async function refreshRecommendations(matchId: string | null) {
  const { supabase, orgId } = await ctx();
  const context = await buildContext(orgId, matchId);
  const recs = generateRecommendations(context, matchId);
  if (recs.length) {
    await supabase.from("ai_recommendations").upsert(
      recs.map((r) => ({
        organization_id: orgId,
        match_id: matchId,
        signature: r.signature,
        kind: r.kind,
        title: r.title,
        detail: r.detail,
        severity: r.severity,
        action: r.action,
      })),
      { onConflict: "organization_id,signature", ignoreDuplicates: true },
    );
  }
  revalidatePath("/ai");
}

export async function recommendationFeedback(
  recId: string,
  rating: "accept" | "reject" | "not_useful",
) {
  const { supabase, orgId, userId } = await ctx();
  await supabase.from("ai_feedback").insert({ organization_id: orgId, recommendation_id: recId, rating, created_by: userId });
  const status = rating === "accept" ? "accepted" : rating === "reject" ? "rejected" : "dismissed";
  await supabase.from("ai_recommendations").update({ status }).eq("id", recId);
  revalidatePath("/ai");
}

export async function createTask(
  kind: string,
  title: string,
  matchId: string | null,
  params: Record<string, unknown> = {},
) {
  const { supabase, orgId, operator, userId } = await ctx();
  await supabase.from("ai_tasks").insert({
    organization_id: orgId,
    match_id: matchId,
    kind,
    title,
    params,
    status: "draft",
    operator_label: operator,
    created_by: userId,
  });
  revalidatePath("/ai");
}

/** Approve a drafted task — the ONLY path to execution. Calls engine APIs. */
export async function approveTask(taskId: string) {
  const { supabase, orgId } = await ctx();
  const { data: task } = await supabase
    .from("ai_tasks")
    .select("kind, params, match_id")
    .eq("id", taskId)
    .maybeSingle();
  if (!task) return;

  await supabase.from("ai_tasks").update({ status: "approved" }).eq("id", taskId);

  try {
    const params = (task.params ?? {}) as Record<string, any>;
    let result: Record<string, unknown> = {};
    switch (task.kind) {
      case "create_playlist":
        await createCollection(params.name ?? "Playlist", params.kind ?? "custom");
        result = { message: "Collection média créée" };
        break;
      case "tag_media":
        if (params.assetId) await addTag(params.assetId, params.tag ?? "auto");
        result = { message: "Asset étiqueté" };
        break;
      case "draft_summary": {
        const context = await buildContext(orgId, task.match_id);
        result = { text: buildMatchSummary(context) };
        break;
      }
      case "generate_report": {
        const context = await buildContext(orgId, task.match_id);
        result = { text: buildBroadcastReport(context) };
        break;
      }
      default:
        result = { message: "Tâche traitée" };
    }
    await supabase.from("ai_tasks").update({ status: "executed", result }).eq("id", taskId);
  } catch (err) {
    await supabase
      .from("ai_tasks")
      .update({ status: "error", result: { error: err instanceof Error ? err.message : "Erreur" } })
      .eq("id", taskId);
  }
  revalidatePath("/ai");
}

export async function rejectTask(taskId: string) {
  const { supabase } = await ctx();
  await supabase.from("ai_tasks").update({ status: "rejected" }).eq("id", taskId);
  revalidatePath("/ai");
}
