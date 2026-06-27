import type { DeviceAdapter, DeviceType } from "@teranga/agent-core";
import { OBSAdapter, type OBSAdapterConfig } from "./obs-adapter.js";
import {
  AtemAdapter,
  EvsAdapter,
  FfmpegAdapter,
  HyperdeckAdapter,
  NdiAdapter,
  VmixAdapter,
} from "./stubs.js";

export { OBSAdapter, type OBSAdapterConfig };
export {
  VmixAdapter,
  AtemAdapter,
  NdiAdapter,
  FfmpegAdapter,
  HyperdeckAdapter,
  EvsAdapter,
};

/** Construct an adapter for a device type. Only OBS is functional this phase. */
export function createAdapter(
  type: DeviceType,
  config: { obs?: OBSAdapterConfig } = {},
): DeviceAdapter {
  switch (type) {
    case "obs":
      return new OBSAdapter(config.obs ?? { url: "ws://127.0.0.1:4455" });
    case "vmix":
      return new VmixAdapter();
    case "atem":
      return new AtemAdapter();
    case "ndi":
      return new NdiAdapter();
    case "ffmpeg":
      return new FfmpegAdapter();
    case "hyperdeck":
      return new HyperdeckAdapter();
    case "evs":
      return new EvsAdapter();
    default:
      throw new Error(`Unknown device type: ${String(type)}`);
  }
}
