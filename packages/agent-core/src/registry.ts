import type {
  DeviceCapabilities,
  DeviceStatusMessage,
  DeviceType,
} from "./protocol.js";

/** A device adapter contract (implemented in @teranga/device-adapters). */
export interface DeviceAdapter {
  readonly type: DeviceType;
  readonly key: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  /** Lightweight liveness check; resolves true if the device is reachable. */
  heartbeat(): Promise<boolean>;
  capabilities(): DeviceCapabilities;
  status(): Promise<DeviceStatusMessage>;
}

/**
 * Device Registry — the set of hardware adapters the Agent manages. Future
 * adapters register here without changing Production / Replay / Graphics.
 */
export class DeviceRegistry {
  private readonly devices = new Map<string, DeviceAdapter>();

  register(adapter: DeviceAdapter): void {
    this.devices.set(adapter.key, adapter);
  }

  unregister(key: string): void {
    this.devices.delete(key);
  }

  get(key: string): DeviceAdapter | undefined {
    return this.devices.get(key);
  }

  list(): DeviceAdapter[] {
    return [...this.devices.values()];
  }
}
