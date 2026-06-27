/**
 * @teranga/obs — typed OBS WebSocket v5 client.
 *
 * PLACEHOLDER. Exposes an intent-level `ObsClient` interface (switchToScene,
 * startRecording, loadReplayClip, ...) rather than raw protocol calls, so that
 * future backends (vMix, NDI, Blackmagic) can implement the same intents without
 * changing the console or workflows.
 *
 * See docs/07-obs-integration.md.
 */

/** Connection + media-control intents. Implementation arrives in Phase 0/1. */
export interface ObsClient {
  connect(opts: { url: string; password?: string }): Promise<void>;
  disconnect(): Promise<void>;

  // Scenes & sources
  switchToScene(name: string): Promise<void>;
  setSourceVisible(scene: string, item: string, visible: boolean): Promise<void>;

  // Recording / streaming
  startRecording(): Promise<void>;
  stopRecording(): Promise<void>;

  // Replay playback (MVP path: OBS media-source swap)
  loadReplayClip(path: string): Promise<void>;
  playReplay(opts: { speed: number }): Promise<void>;
  returnToLive(): Promise<void>;
}

export const TERANGA_OBS_PLACEHOLDER = true as const;
