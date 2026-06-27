/** Web-side view types for the Kernel AgentRegistry (read-only). */

export type AgentHealth = {
  cpuPercent?: number | null;
  memPercent?: number | null;
  diskPercent?: number | null;
  gpuPercent?: number | null;
  networkUp?: boolean;
  realtimeLatencyMs?: number | null;
};

export type AgentRow = {
  id: string;
  agentKey: string;
  name: string;
  platform: string | null;
  version: string | null;
  status: "online" | "degraded" | "offline";
  health: AgentHealth;
  lastSeenAt: string | null;
};

export type OBSStats = {
  version?: string | null;
  connected?: boolean;
  streaming?: boolean;
  recording?: boolean;
  currentScene?: string | null;
  programScene?: string | null;
  previewScene?: string | null;
  fps?: number | null;
  droppedFrames?: number | null;
  bitrate?: number | null;
  cpuUsage?: number | null;
  encoder?: string | null;
};

export type DeviceRow = {
  id: string;
  agentId: string;
  deviceType: string;
  deviceKey: string;
  status: "connected" | "connecting" | "disconnected" | "error" | "offline";
  version: string | null;
  latencyMs: number | null;
  capabilities: Record<string, boolean>;
  stats: OBSStats & Record<string, unknown>;
};

/** Heartbeat freshness threshold (mirrors agent-core HEARTBEAT_STALE_MS). */
export const STALE_MS = 15000;

export function isAgentLive(agent: AgentRow, nowMs: number): boolean {
  if (agent.status === "offline" || !agent.lastSeenAt) return false;
  return nowMs - Date.parse(agent.lastSeenAt) < STALE_MS;
}

export function secondsAgo(iso: string | null, nowMs: number): string {
  if (!iso) return "—";
  const s = Math.max(0, Math.round((nowMs - Date.parse(iso)) / 1000));
  return `il y a ${s}s`;
}
