"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { mapAgent, mapDevice } from "@/features/devices/map";
import type { AgentRow, DeviceRow } from "@/features/devices/types";

/**
 * Live Kernel AgentRegistry view for an org: agents + devices, refetched on any
 * Realtime change, plus a 1s ticker so heartbeat freshness/staleness updates.
 */
export function useDevices(
  orgId: string,
  initialAgents: AgentRow[],
  initialDevices: DeviceRow[],
) {
  const [agents, setAgents] = useState<AgentRow[]>(initialAgents);
  const [devices, setDevices] = useState<DeviceRow[]>(initialDevices);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  const refetch = useCallback(async () => {
    const supabase = createClient();
    const [a, d] = await Promise.all([
      supabase.from("broadcast_agents").select("*").eq("organization_id", orgId),
      supabase.from("agent_devices").select("*").eq("organization_id", orgId),
    ]);
    setAgents((a.data ?? []).map(mapAgent));
    setDevices((d.data ?? []).map(mapDevice));
  }, [orgId]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`devices:${orgId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "broadcast_agents", filter: `organization_id=eq.${orgId}` },
        () => void refetch(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agent_devices", filter: `organization_id=eq.${orgId}` },
        () => void refetch(),
      )
      .subscribe();
    return () => {
      channel.unsubscribe();
    };
  }, [orgId, refetch]);

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return { agents, devices, nowMs };
}
