import { createClient } from "@/lib/supabase/server";
import type { AgentRow, DeviceRow } from "./types";
import { mapAgent, mapDevice } from "./map";

export async function getAgents(orgId: string): Promise<AgentRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("broadcast_agents")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: true });
  return (data ?? []).map(mapAgent);
}

export async function getDevices(orgId: string): Promise<DeviceRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("agent_devices")
    .select("*")
    .eq("organization_id", orgId);
  return (data ?? []).map(mapDevice);
}
