import {
  ConnectionManager,
  DeviceRegistry,
  ensureMediaDirs,
  HEARTBEAT_INTERVAL_MS,
  type AgentHeartbeat,
  type AgentStatus,
} from "@teranga/agent-core";
import { createAdapter } from "@teranga/device-adapters";
import { loadConfig, AGENT_VERSION } from "./config.js";
import { gatherHealth, PLATFORM } from "./health.js";
import { SupabaseReporter } from "./reporter.js";

/**
 * Teranga Broadcast Agent — long-running local service.
 *
 * Bridges Teranga Broadcast with broadcast hardware: discovers devices (OBS
 * read-only this phase), monitors health, and reports heartbeats to the platform
 * (Kernel AgentRegistry over Supabase). NO media, NO device control.
 */
async function main(): Promise<void> {
  const cfg = loadConfig();
  console.log(`[agent] Teranga Broadcast Agent v${AGENT_VERSION} (${cfg.agentName})`);

  // 1) Local media storage (folders only).
  const paths = ensureMediaDirs(cfg.mediaRoot);
  console.log(`[agent] media root: ${paths.root}`);

  // 2) Device registry + manager. Only OBS is functional; others are stubs.
  const registry = new DeviceRegistry();
  registry.register(
    createAdapter("obs", { obs: { url: cfg.obsUrl, password: cfg.obsPassword } }),
  );
  const manager = new ConnectionManager(registry);

  // 3) Platform reporter (Supabase / Kernel AgentRegistry).
  const reporter = new SupabaseReporter(cfg);

  let stopping = false;

  async function tick(): Promise<void> {
    const now = Date.now();
    const devices = await manager.tick(now);
    const latency = await reporter.ping();
    const health = gatherHealth(cfg.mediaRoot, latency);

    const anyConnected = devices.some((d) => d.status === "connected");
    const anyError = devices.some((d) => d.status === "error");
    const status: AgentStatus = anyError && !anyConnected ? "degraded" : "online";

    const hb: AgentHeartbeat = {
      agentKey: cfg.agentKey,
      name: cfg.agentName,
      version: AGENT_VERSION,
      platform: PLATFORM,
      status,
      health,
      devices,
      at: new Date().toISOString(),
    };
    await reporter.report(hb);

    const obs = devices.find((d) => d.deviceType === "obs");
    console.log(
      `[agent] heartbeat · obs=${obs?.status ?? "n/a"} · cpu=${health.cpuPercent ?? "?"}% · rtt=${latency ?? "?"}ms`,
    );
  }

  // 4) Heartbeat loop.
  await tick();
  const timer = setInterval(() => {
    if (!stopping) void tick();
  }, HEARTBEAT_INTERVAL_MS);

  async function shutdown(): Promise<void> {
    if (stopping) return;
    stopping = true;
    clearInterval(timer);
    console.log("[agent] shutting down…");
    for (const d of registry.list()) await d.disconnect().catch(() => {});
    await reporter.markOffline(cfg.agentKey).catch(() => {});
    process.exit(0);
  }

  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
}

main().catch((err) => {
  console.error("[agent] fatal:", err);
  process.exit(1);
});
