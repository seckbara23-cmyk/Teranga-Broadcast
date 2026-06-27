# @teranga/obs

Typed **OBS WebSocket v5** client for Teranga Broadcast. It exposes an
**intent-level** `ObsClient` interface — `switchToScene`, `startRecording`,
`loadReplayClip`, `playReplay`, `returnToLive` — instead of raw protocol requests.

## Why intent-level

This package is the **single place** that maps Teranga's intent to a broadcast
backend's protocol. Keeping that seam means future backends — **vMix**, **NDI**,
**Blackmagic DeckLink** — can implement the same `ObsClient` contract without
touching the operator console or workflows.

The OBS WebSocket connection is owned by the **Teranga Agent** (`apps/agent`), not
the browser, so the session is persistent and credentials stay on the local
machine.

## Dependencies

- `@teranga/core`, `@teranga/types` (workspace).
- `obs-websocket-js` (optional peer) — the underlying v5 protocol library.

> Status: **placeholder** — only the `ObsClient` interface is sketched.
> See [docs/07-obs-integration.md](../../docs/07-obs-integration.md).
