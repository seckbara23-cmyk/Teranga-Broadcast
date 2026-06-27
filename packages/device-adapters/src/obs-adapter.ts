import type {
  DeviceAdapter,
  DeviceCapabilities,
  DeviceStatusMessage,
  OBSStatus,
} from "@teranga/agent-core";

export interface OBSAdapterConfig {
  url: string;
  password?: string;
  key?: string;
}

/**
 * READ-ONLY OBS adapter (Phase 5). Detects version, connection, streaming /
 * recording state, scenes, and stats. It does NOT control OBS — no scene
 * switching, no record/stream start/stop. obs-websocket-js is loaded via dynamic
 * import so the package type-checks without coupling to the library's types.
 */
export class OBSAdapter implements DeviceAdapter {
  readonly type = "obs" as const;
  readonly key: string;

  private obs: any = null;
  private connected = false;
  private lastBytes: number | null = null;
  private lastBytesAt = 0;

  constructor(private readonly cfg: OBSAdapterConfig) {
    this.key = cfg.key ?? "obs-program";
  }

  capabilities(): DeviceCapabilities {
    // Read-only foundation: control is intentionally false.
    return {
      read: true,
      control: false,
      replayBuffer: true,
      streaming: true,
      recording: true,
    };
  }

  async connect(): Promise<void> {
    const mod: any = await import("obs-websocket-js");
    const OBSWebSocket = mod.default ?? mod;
    this.obs = new OBSWebSocket();
    this.obs.on?.("ConnectionClosed", () => {
      this.connected = false;
    });
    await this.obs.connect(this.cfg.url, this.cfg.password);
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    try {
      await this.obs?.disconnect();
    } catch {
      /* ignore */
    }
    this.connected = false;
    this.obs = null;
  }

  async heartbeat(): Promise<boolean> {
    if (!this.obs || !this.connected) return false;
    try {
      await this.obs.call("GetVersion");
      return true;
    } catch {
      this.connected = false;
      return false;
    }
  }

  private computeBitrateKbps(outputBytes: number | undefined): number | null {
    if (outputBytes == null) return null;
    const now = Date.now();
    let kbps: number | null = null;
    if (this.lastBytes != null && now > this.lastBytesAt) {
      const dt = (now - this.lastBytesAt) / 1000;
      const delta = outputBytes - this.lastBytes;
      if (dt > 0 && delta >= 0) kbps = Math.round((delta * 8) / 1000 / dt);
    }
    this.lastBytes = outputBytes;
    this.lastBytesAt = now;
    return kbps;
  }

  async status(): Promise<DeviceStatusMessage> {
    if (!this.obs || !this.connected) {
      return {
        deviceType: "obs",
        deviceKey: this.key,
        status: "disconnected",
        version: null,
        latencyMs: null,
        capabilities: this.capabilities(),
        stats: {},
      };
    }

    const obs = this.obs;
    const safe = async (req: string): Promise<any> => {
      try {
        return await obs.call(req);
      } catch {
        return null;
      }
    };

    const t0 = Date.now();
    const version = await safe("GetVersion");
    const stream = await safe("GetStreamStatus");
    const record = await safe("GetRecordStatus");
    const stats = await safe("GetStats");
    const program = await safe("GetCurrentProgramScene");
    const preview = await safe("GetCurrentPreviewScene");
    const latencyMs = Date.now() - t0;

    const obsStatus: OBSStatus = {
      version: version?.obsVersion ?? null,
      connected: true,
      streaming: !!stream?.outputActive,
      recording: !!record?.outputActive,
      currentScene:
        program?.currentProgramSceneName ?? program?.sceneName ?? null,
      programScene: program?.currentProgramSceneName ?? null,
      previewScene: preview?.currentPreviewSceneName ?? null,
      fps: stats?.activeFps != null ? Math.round(stats.activeFps * 100) / 100 : null,
      droppedFrames:
        stats?.outputSkippedFrames ?? stats?.renderSkippedFrames ?? null,
      bitrate: this.computeBitrateKbps(stream?.outputBytes),
      cpuUsage:
        stats?.cpuUsage != null ? Math.round(stats.cpuUsage * 10) / 10 : null,
      encoder: null,
    };

    return {
      deviceType: "obs",
      deviceKey: this.key,
      status: "connected",
      version: obsStatus.version,
      latencyMs,
      capabilities: this.capabilities(),
      stats: obsStatus as unknown as Record<string, unknown>,
    };
  }
}
