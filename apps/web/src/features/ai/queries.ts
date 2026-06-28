import { createClient } from "@/lib/supabase/server";
import { mapMessage, mapRecommendation, mapTask } from "./map";
import type { AiMessage, AiRecommendation, AiTask } from "./types";

/** Get or create the conversation for a workspace (+ match). */
export async function getOrCreateConversation(
  orgId: string,
  workspace: string,
  matchId: string | null,
  userId: string | null,
): Promise<string> {
  const supabase = await createClient();
  let q = supabase
    .from("ai_conversations")
    .select("id")
    .eq("organization_id", orgId)
    .eq("workspace", workspace)
    .order("created_at", { ascending: false })
    .limit(1);
  q = matchId ? q.eq("match_id", matchId) : q.is("match_id", null);
  const { data: existing } = await q.maybeSingle();
  if (existing) return existing.id;

  const { data: created } = await supabase
    .from("ai_conversations")
    .insert({
      organization_id: orgId,
      workspace,
      match_id: matchId,
      title: `Copilote · ${workspace}`,
      created_by: userId,
    })
    .select("id")
    .single();
  return created!.id;
}

export async function listMessages(conversationId: string): Promise<AiMessage[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(200);
  return (data ?? []).map(mapMessage);
}

export async function listRecommendations(orgId: string): Promise<AiRecommendation[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_recommendations")
    .select("*")
    .eq("organization_id", orgId)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []).map(mapRecommendation);
}

export async function listTasks(orgId: string): Promise<AiTask[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_tasks")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []).map(mapTask);
}
