/**
 * Teranga Broadcast Agent — wire protocol (metadata only, NO media).
 *
 * The Agent communicates with the platform over a secure WebSocket — in this
 * deployment, Supabase Realtime + the Kernel AgentRegistry tables. These types
 * define the messages: Heartbeat, DeviceStatus, OBSStatus, Capabilities,
 * ReplayBufferStatus.
 */

export type DeviceType =
  | "obs"
  | "vmix"
  | "atem"
  | "ndi"
  | "ffmpeg"
  | "hyperdeck"
  | "evs";

export type DeviceConnectionStatus =
  | "connected"
  | "connecting"
  | "disconnected"
  | "error"
  | "offline";

export type AgentStatus = "online" | "degraded" | "offline";

export interface DeviceCapabilities {
  /** Read device state (this phase). */
  read: boolean;
  /** Control device (scenes, record, stream) — false in the foundation. */
  control: boolean;
  replayBuffer: boolean;
  streaming: boolean;
  recording: boolean;
}

/** Read-only OBS state surfaced by the OBS adapter. */
export interface OBSStatus {
  version: string | null;
  connected: boolean;
  streaming: boolean;
  recording: boolean;
  currentScene: string | null;
  programScene: string | null;
  previewScene: string | null;
  fps: number | null;
  droppedFrames: number | null;
  bitrate: number | null;
  cpuUsage: number | null;
  encoder: string | null;
}

/** Replay buffer monitor (interface only — no replay yet). */
export interface ReplayBufferStatus {
  active: boolean;
  bufferSeconds: number | null;
  segmentCount: number | null;
  diskUsedBytes: number | null;
  oldestSegmentAt: string | null;
  newestSegmentAt: string | null;
}

export interface DeviceStatusMessage {
  deviceType: DeviceType;
  deviceKey: string;
  status: DeviceConnectionStatus;
  version: string | null;
  latencyMs: number | null;
  capabilities: DeviceCapabilities;
  /** Device-specific snapshot (e.g. OBSStatus, ReplayBufferStatus). */
  stats: Record<string, unknown>;
}

export interface SystemHealth {
  cpuPercent: number | null;
  memPercent: number | null;
  diskPercent: number | null;
  gpuPercent: number | null;
  networkUp: boolean;
  realtimeLatencyMs: number | null;
}

export interface AgentHeartbeat {
  agentKey: string;
  name: string;
  version: string;
  platform: string;
  status: AgentStatus;
  health: SystemHealth;
  devices: DeviceStatusMessage[];
  at: string;
}

export const HEARTBEAT_INTERVAL_MS = 5000;
/** A device/agent is considered stale (offline) past this since last heartbeat. */
export const HEARTBEAT_STALE_MS = 15000;
