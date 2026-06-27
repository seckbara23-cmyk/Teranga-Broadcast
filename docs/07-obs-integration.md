# 07 — OBS Integration Plan

OBS Studio is Teranga Broadcast's video engine for the MVP. We control it through
the **OBS WebSocket v5** protocol (built into OBS 28+). This document defines the
control layer.

## Why OBS first
- Free, mature, GPU-accelerated (NVENC), cross-platform.
- Scene/source compositing, recording, streaming, and **Browser Sources** for
  overlays — everything the MVP needs.
- A well-documented WebSocket API (v5) for remote control.
- A natural bridge to NDI/SDI later via OBS plugins.

## Connection model

The **Teranga Agent** (not the browser) owns the OBS WebSocket connection.

```
Operator Console (browser)
        │  commands/status via Supabase Realtime
        ▼
   Teranga Agent  ──── OBS WebSocket v5 (ws://localhost:4455) ──►  OBS Studio
```

Reasons the Agent owns it:
- Persistent, reconnecting session independent of any open browser tab.
- Keeps the OBS password/host on the local machine, never in the browser.
- Co-located with the replay buffer and FFmpeg.

> Exception: a thin **read-only** OBS status view *could* connect directly from
> the browser on the LAN for diagnostics, but all control goes through the Agent.

## Capabilities used (OBS WebSocket v5)

| Capability | OBS WS requests/events (illustrative) |
|------------|----------------------------------------|
| Connection & auth | `Identify` handshake, `GetVersion` |
| Health/status | `GetStats`, `StreamStateChanged`, `RecordStateChanged` |
| Scenes | `GetSceneList`, `SetCurrentProgramScene`, `GetCurrentProgramScene` |
| Sources/inputs | `GetInputList`, `SetInputSettings`, `GetSceneItemList` |
| Visibility | `SetSceneItemEnabled` (toggle lower-thirds, overlays) |
| Recording | `StartRecord`, `StopRecord`, `GetRecordStatus` |
| Streaming | `StartStream`, `StopStream`, `GetStreamStatus` |
| Replay media | `CreateInput`/`SetInputSettings` on a Media Source, `TriggerMediaInputAction` |
| Transitions | `SetCurrentSceneTransition`, `TriggerStudioModeTransition` |

> Exact request names follow the OBS WebSocket v5 spec; the typed wrapper in
> `packages/obs` is the single place that maps our intent → protocol.

## Typed OBS client (`packages/obs`)

A thin, fully-typed wrapper exposing **intent-level** methods, not raw protocol:

```ts
interface ObsClient {
  connect(opts: { url: string; password?: string }): Promise<void>;
  onStatus(cb: (s: ObsStatus) => void): void;          // streaming/recording/stats

  listScenes(): Promise<Scene[]>;
  switchToScene(name: string): Promise<void>;

  setSourceVisible(scene: string, item: string, visible: boolean): Promise<void>;

  startRecording(): Promise<void>;
  stopRecording(): Promise<void>;

  loadReplayClip(path: string): Promise<void>;          // points the Media Source
  playReplay(opts: { speed: number }): Promise<void>;
  returnToLive(): Promise<void>;
}
```

This isolates OBS specifics so a future `VmixClient` / `NdiClient` can implement
the same control intents.

## Scene conventions (recommended OBS setup)

The platform expects a small set of named scenes/sources so it can drive them:

- `PGM_Live` — the live program scene (camera/program input).
- `PGM_Replay` — a scene containing the **Replay Media Source**.
- `PGM_Break` — holding/break scene.
- Browser sources (added to relevant scenes):
  - `Overlay_Scoreboard` → `/overlay/scoreboard/{matchId}?token=...`
  - `Overlay_LowerThird` → `/overlay/lower-third/{matchId}?token=...`

A **setup wizard** in the console verifies these exist (and offers to create them
via the WebSocket API) during pre-match checks.

## Overlays as Browser Sources

- Overlay routes are Next.js pages with `background: transparent`.
- They subscribe to Supabase Realtime for that match and render the current
  scoreboard / lower-third state.
- OBS renders the page and composites it over the program — no plugin needed.
- A **per-match signed token** in the URL authorizes the read-only subscription.

## Replay playback via OBS (MVP path)

1. Agent cuts the marked clip to `…/replay_tmp/clip.mp4`.
2. `loadReplayClip(path)` sets the `PGM_Replay` Media Source file.
3. Producer/operator triggers transition to `PGM_Replay`.
4. `playReplay({ speed })` triggers playback (rate set on the media source).
5. On media-end (or manual), `returnToLive()` transitions back to `PGM_Live`.

## Health monitoring

The Agent polls/subscribes and surfaces to the console:
- Connection state, OBS version, active profile/collection.
- Streaming/recording state + duration.
- `GetStats`: CPU, memory, **dropped/skipped frames**, render lag, output FPS.
- Disk space (from the Agent's own OS checks).

Alarms (loud in UI): disconnect, dropped frames above threshold, recording
stopped unexpectedly, low disk.

## Reconnection & resilience
- Exponential backoff reconnect to OBS; surface "OBS offline" prominently.
- Commands queued while disconnected are rejected with clear feedback (never
  silently dropped) — except idempotent state we can re-assert on reconnect.
- The Agent re-asserts expected scene/source state after reconnect.

## Security
- OBS WebSocket password stored only in the Agent's local config (never synced).
- Bind OBS WebSocket to localhost/LAN; do not expose to the internet.
- Overlay tokens are short-lived and match-scoped.

## Future control backends
The intent-level `ObsClient` interface is the seam for:
- **vMix** (HTTP/TCP API) — `VmixClient`.
- **NDI** ingest/output (OBS NDI plugin or native NDI) for multi-camera.
- **Blackmagic DeckLink** SDI in/out for true broadcast I/O.

These plug in behind the same command contracts in `packages/core`, so the
console and workflows do not change.
