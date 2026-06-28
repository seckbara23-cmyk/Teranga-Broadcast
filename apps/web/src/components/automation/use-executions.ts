"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { mapExecution } from "@/features/automation/map";
import type { Execution } from "@/features/automation/types";

/** Live automation executions (incl. pending approvals) for an org. */
export function useExecutions(orgId: string, initial: Execution[]) {
  const [executions, setExecutions] = useState<Execution[]>(initial);

  const refetch = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("automation_executions")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(50);
    setExecutions((data ?? []).map(mapExecution));
  }, [orgId]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`automation:${orgId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "automation_executions", filter: `organization_id=eq.${orgId}` }, () => void refetch())
      .subscribe();
    return () => {
      channel.unsubscribe();
    };
  }, [orgId, refetch]);

  return executions;
}
