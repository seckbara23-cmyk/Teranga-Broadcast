"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { mapMessage, mapRecommendation, mapTask } from "@/features/ai/map";
import type { AiMessage, AiRecommendation, AiTask } from "@/features/ai/types";

export function useAi(
  orgId: string,
  conversationId: string,
  initialMessages: AiMessage[],
  initialRecs: AiRecommendation[],
  initialTasks: AiTask[],
) {
  const [messages, setMessages] = useState<AiMessage[]>(initialMessages);
  const [recommendations, setRecommendations] = useState<AiRecommendation[]>(initialRecs);
  const [tasks, setTasks] = useState<AiTask[]>(initialTasks);

  const refetch = useCallback(async () => {
    const supabase = createClient();
    const [m, r, t] = await Promise.all([
      supabase.from("ai_messages").select("*").eq("conversation_id", conversationId).order("created_at", { ascending: true }).limit(200),
      supabase.from("ai_recommendations").select("*").eq("organization_id", orgId).eq("status", "open").order("created_at", { ascending: false }).limit(50),
      supabase.from("ai_tasks").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(50),
    ]);
    setMessages((m.data ?? []).map(mapMessage));
    setRecommendations((r.data ?? []).map(mapRecommendation));
    setTasks((t.data ?? []).map(mapTask));
  }, [orgId, conversationId]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`ai:${orgId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "ai_messages", filter: `conversation_id=eq.${conversationId}` }, () => void refetch())
      .on("postgres_changes", { event: "*", schema: "public", table: "ai_recommendations", filter: `organization_id=eq.${orgId}` }, () => void refetch())
      .on("postgres_changes", { event: "*", schema: "public", table: "ai_tasks", filter: `organization_id=eq.${orgId}` }, () => void refetch())
      .subscribe();
    return () => {
      channel.unsubscribe();
    };
  }, [orgId, conversationId, refetch]);

  return { messages, recommendations, tasks };
}
