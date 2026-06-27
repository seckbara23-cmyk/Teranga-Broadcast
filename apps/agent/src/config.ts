import { hostname } from "node:os";

/** Agent configuration from the environment (see apps/agent/.env.example). */
export interface AgentConfig {
  supabaseUrl: string;
  supabaseServiceKey: string;
  organizationId: string;
  agentKey: string;
  agentName: string;
  obsUrl: string;
  obsPassword: string | undefined;
  mediaRoot: string;
}

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export function loadConfig(): AgentConfig {
  const host = hostname();
  return {
    supabaseUrl: required("SUPABASE_URL"),
    supabaseServiceKey: required("SUPABASE_SERVICE_ROLE_KEY"),
    organizationId: required("TERANGA_ORG_ID"),
    agentKey: process.env.AGENT_KEY || host,
    agentName: process.env.AGENT_NAME || `Agent ${host}`,
    obsUrl: process.env.OBS_WEBSOCKET_URL || "ws://127.0.0.1:4455",
    obsPassword: process.env.OBS_WEBSOCKET_PASSWORD || undefined,
    mediaRoot: process.env.MEDIA_ROOT || "./media",
  };
}

export const AGENT_VERSION = "0.1.0";
