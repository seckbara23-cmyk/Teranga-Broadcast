import { cpus, freemem, totalmem, networkInterfaces, platform } from "node:os";
import { statfsSync } from "node:fs";
import type { SystemHealth } from "@teranga/agent-core";

let lastIdle = 0;
let lastTotal = 0;

/** Rough CPU utilisation from os.cpus() time deltas across calls. */
function cpuPercent(): number | null {
  const cores = cpus();
  if (!cores.length) return null;
  let idle = 0;
  let total = 0;
  for (const c of cores) {
    const t = c.times;
    idle += t.idle;
    total += t.user + t.nice + t.sys + t.idle + t.irq;
  }
  const idleDelta = idle - lastIdle;
  const totalDelta = total - lastTotal;
  lastIdle = idle;
  lastTotal = total;
  if (totalDelta <= 0) return null;
  return Math.round((1 - idleDelta / totalDelta) * 1000) / 10;
}

function memPercent(): number | null {
  const total = totalmem();
  if (!total) return null;
  return Math.round(((total - freemem()) / total) * 1000) / 10;
}

function diskPercent(root: string): number | null {
  try {
    const fs = statfsSync(root);
    const total = fs.blocks * fs.bsize;
    const free = fs.bfree * fs.bsize;
    if (!total) return null;
    return Math.round(((total - free) / total) * 1000) / 10;
  } catch {
    return null;
  }
}

function networkUp(): boolean {
  const ifaces = networkInterfaces();
  return Object.values(ifaces).some((addrs) =>
    (addrs ?? []).some((a) => !a.internal),
  );
}

export function gatherHealth(
  mediaRoot: string,
  realtimeLatencyMs: number | null,
): SystemHealth {
  return {
    cpuPercent: cpuPercent(),
    memPercent: memPercent(),
    diskPercent: diskPercent(mediaRoot),
    gpuPercent: null, // GPU metrics require vendor tooling — placeholder
    networkUp: networkUp(),
    realtimeLatencyMs,
  };
}

export const PLATFORM = platform();
