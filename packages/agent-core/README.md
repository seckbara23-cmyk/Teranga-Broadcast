# @teranga/agent-core

Core of the **Teranga Broadcast Agent** — the local service that bridges Teranga
Broadcast with professional broadcast hardware.

Transport-agnostic and **media-free** (metadata only). Contains:

- **`protocol.ts`** — the wire messages (Heartbeat, DeviceStatus, OBSStatus,
  Capabilities, ReplayBufferStatus) and the `SystemHealth` snapshot.
- **`registry.ts`** — the `DeviceAdapter` contract + `DeviceRegistry`.
- **`manager.ts`** — `ConnectionManager`: heartbeats + exponential-backoff
  reconnect; pure orchestration.
- **`storage.ts`** — local media folder layout (`buffer/`, `clips/`, `exports/`,
  `logs/`) — folder management only.

Adapters live in [`@teranga/device-adapters`](../device-adapters); the runnable
service is [`apps/agent`](../../apps/agent). The Agent reports to the platform via
the Kernel AgentRegistry tables over Supabase Realtime (the secure WebSocket).
