import type {
  DeviceAdapter,
  DeviceCapabilities,
  DeviceStatusMessage,
  DeviceType,
} from "@teranga/agent-core";

/**
 * Interface-only adapters for hardware not yet implemented. They satisfy the
 * DeviceAdapter contract so the Device Manager and future work can target them
 * without changing Production / Replay / Graphics.
 */
class NotImplementedAdapter implements DeviceAdapter {
  constructor(
    readonly type: DeviceType,
    readonly key: string,
  ) {}

  capabilities(): DeviceCapabilities {
    return {
      read: false,
      control: false,
      replayBuffer: false,
      streaming: false,
      recording: false,
    };
  }

  async connect(): Promise<void> {
    throw new Error(`${this.type} adapter is not implemented yet`);
  }
  async disconnect(): Promise<void> {}
  async heartbeat(): Promise<boolean> {
    return false;
  }
  async status(): Promise<DeviceStatusMessage> {
    return {
      deviceType: this.type,
      deviceKey: this.key,
      status: "offline",
      version: null,
      latencyMs: null,
      capabilities: this.capabilities(),
      stats: {},
    };
  }
}

export class VmixAdapter extends NotImplementedAdapter {
  constructor(key = "vmix") {
    super("vmix", key);
  }
}
export class AtemAdapter extends NotImplementedAdapter {
  constructor(key = "atem") {
    super("atem", key);
  }
}
export class NdiAdapter extends NotImplementedAdapter {
  constructor(key = "ndi") {
    super("ndi", key);
  }
}
export class FfmpegAdapter extends NotImplementedAdapter {
  constructor(key = "ffmpeg") {
    super("ffmpeg", key);
  }
}
export class HyperdeckAdapter extends NotImplementedAdapter {
  constructor(key = "hyperdeck") {
    super("hyperdeck", key);
  }
}
export class EvsAdapter extends NotImplementedAdapter {
  constructor(key = "evs") {
    super("evs", key);
  }
}
