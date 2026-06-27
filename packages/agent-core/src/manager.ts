import type { DeviceAdapter, DeviceRegistry } from "./registry.js";
import type { DeviceStatusMessage } from "./protocol.js";

/** Per-device connection state with exponential-backoff reconnect bookkeeping. */
interface ConnState {
  connected: boolean;
  attempts: number;
  nextRetryAt: number;
}

/**
 * Connection Manager — keeps adapters connected, runs heartbeats, and reconnects
 * with exponential backoff. Pure orchestration: it never touches media or the
 * platform transport; the caller polls collectStatuses() on each tick.
 */
export class ConnectionManager {
  private readonly state = new Map<string, ConnState>();

  constructor(
    private readonly registry: DeviceRegistry,
    private readonly opts: { maxBackoffMs?: number } = {},
  ) {}

  private stateFor(key: string): ConnState {
    let s = this.state.get(key);
    if (!s) {
      s = { connected: false, attempts: 0, nextRetryAt: 0 };
      this.state.set(key, s);
    }
    return s;
  }

  private backoff(attempts: number): number {
    const base = Math.min(1000 * 2 ** attempts, this.opts.maxBackoffMs ?? 30000);
    return base;
  }

  /** Ensure connected; on failure, schedule a backoff retry. */
  async ensureConnected(adapter: DeviceAdapter, now: number): Promise<void> {
    const s = this.stateFor(adapter.key);
    if (s.connected) {
      const alive = await adapter.heartbeat().catch(() => false);
      if (alive) return;
      s.connected = false;
      s.attempts = 0;
    }
    if (now < s.nextRetryAt) return;

    try {
      await adapter.connect();
      s.connected = true;
      s.attempts = 0;
      s.nextRetryAt = 0;
    } catch {
      s.attempts += 1;
      s.nextRetryAt = now + this.backoff(s.attempts);
    }
  }

  /** Connect/heartbeat every device, then return their current status. */
  async tick(now: number): Promise<DeviceStatusMessage[]> {
    const adapters = this.registry.list();
    await Promise.all(adapters.map((a) => this.ensureConnected(a, now)));
    return Promise.all(
      adapters.map((a) =>
        a.status().catch(
          (): DeviceStatusMessage => ({
            deviceType: a.type,
            deviceKey: a.key,
            status: "error",
            version: null,
            latencyMs: null,
            capabilities: a.capabilities(),
            stats: {},
          }),
        ),
      ),
    );
  }

  isConnected(key: string): boolean {
    return this.state.get(key)?.connected ?? false;
  }
}
