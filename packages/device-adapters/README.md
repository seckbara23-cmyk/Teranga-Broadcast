# @teranga/device-adapters

Hardware adapters for the Teranga Broadcast Agent. Each adapter implements the
`DeviceAdapter` contract from [`@teranga/agent-core`](../agent-core):
`connect()`, `disconnect()`, `heartbeat()`, `capabilities()`, `status()`.

| Adapter | State |
|---------|-------|
| **OBS** | Implemented — **read-only** (version, connection, stream/record state, scenes, FPS, dropped frames, bitrate, CPU). No control. |
| vMix, Blackmagic ATEM, NDI, FFmpeg, HyperDeck, EVS | Interface stubs (`connect()` throws `not implemented`). |

`createAdapter(type, config)` builds an adapter by type. Future adapters are added
here without touching Production, Replay, or Graphics.

> Out of scope this phase: OBS control, scene switching, record/stream start/stop,
> playback, FFmpeg, encoding.
