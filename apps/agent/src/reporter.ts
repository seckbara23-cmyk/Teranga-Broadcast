import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AgentHeartbeat } from "@teranga/agent-core";
import type { AgentConfig } from "./config.js";

/**
 * Reports the Agent's heartbeat + device statuses to the platform via Supabase
 * (the Kernel AgentRegistry). Uses the service role — the Agent is a trusted
 * local service; operators read via RLS. Metadata only, never media.
 */
export class SupabaseReporter {
  private readonly client: SupabaseClient;
  private agentId: string | null = null;

  constructor(private readonly cfg: AgentConfig) {
    this.client = createClient(cfg.supabaseUrl, cfg.supabaseServiceKey, {
      auth: { persistSession: false },
    });
  }

  /** Measure a round-trip to Supabase for the realtime-latency health metric. */
  async ping(): Promise<number | null> {
    const t0 = Date.now();
    const { error } = await this.client
      .from("broadcast_agents")
      .select("id")
      .eq("organization_id", this.cfg.organizationId)
      .limit(1);
    if (error) return null;
    return Date.now() - t0;
  }

  async report(hb: AgentHeartbeat): Promise<void> {
    const { data: agent, error } = await this.client
      .from("broadcast_agents")
      .upsert(
        {
          organization_id: this.cfg.organizationId,
          agent_key: hb.agentKey,
          name: hb.name,
          platform: hb.platform,
          version: hb.version,
          status: hb.status,
          health: hb.health,
          last_seen_at: hb.at,
        },
        { onConflict: "organization_id,agent_key" },
      )
      .select("id")
      .single();

    if (error || !agent) {
      console.error("[reporter] agent upsert failed:", error?.message);
      return;
    }
    this.agentId = agent.id as string;

    for (const d of hb.devices) {
      const { error: devErr } = await this.client.from("agent_devices").upsert(
        {
          organization_id: this.cfg.organizationId,
          agent_id: this.agentId,
          device_type: d.deviceType,
          device_key: d.deviceKey,
          status: d.status,
          version: d.version,
          latency_ms: d.latencyMs,
          capabilities: d.capabilities,
          stats: d.stats,
        },
        { onConflict: "agent_id,device_type,device_key" },
      );
      if (devErr) console.error("[reporter] device upsert failed:", devErr.message);
    }
  }

  // --- Replay clip pipeline -------------------------------------------------

  async fetchPendingClips(): Promise<{ id: string; post_roll_s: number }[]> {
    const { data } = await this.client
      .from("replay_clips")
      .select("id, post_roll_s")
      .eq("organization_id", this.cfg.organizationId)
      .eq("status", "pending")
      .limit(5);
    return (data ?? []) as { id: string; post_roll_s: number }[];
  }

  async setClipStatus(
    id: string,
    status: "extracting" | "ready" | "error",
    clipPath?: string | null,
  ): Promise<void> {
    const patch: Record<string, unknown> = { status };
    if (clipPath !== undefined) patch.clip_path = clipPath;
    await this.client.from("replay_clips").update(patch).eq("id", id);
  }

  /** Mark the agent offline (best-effort on shutdown). */
  async markOffline(agentKey: string): Promise<void> {
    await this.client
      .from("broadcast_agents")
      .update({ status: "offline" })
      .eq("organization_id", this.cfg.organizationId)
      .eq("agent_key", agentKey);
  }
}
