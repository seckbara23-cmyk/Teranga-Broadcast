import type { AgentRow, DeviceRow } from "./types";

/** Pure row mappers — safe to import from client and server (no server deps). */
export function mapAgent(r: any): AgentRow {
  return {
    id: r.id,
    agentKey: r.agent_key,
    name: r.name,
    platform: r.platform,
    version: r.version,
    status: r.status,
    health: r.health ?? {},
    lastSeenAt: r.last_seen_at,
  };
}

export function mapDevice(r: any): DeviceRow {
  return {
    id: r.id,
    agentId: r.agent_id,
    deviceType: r.device_type,
    deviceKey: r.device_key,
    status: r.status,
    version: r.version,
    latencyMs: r.latency_ms,
    capabilities: r.capabilities ?? {},
    stats: r.stats ?? {},
  };
}
