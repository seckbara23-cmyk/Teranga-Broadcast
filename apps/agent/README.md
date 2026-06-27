# @teranga/agent

The **Teranga Broadcast Agent** — a long-running local service on the production
workstation that bridges Teranga Broadcast with broadcast hardware.

> Phase 5 foundation: **hardware discovery + read-only OBS + health + heartbeat**.
> No device control, no media, no FFmpeg.

## What it does

1. Ensures the local media folder layout (`buffer/`, `clips/`, `exports/`,
   `logs/`) — folders only.
2. Registers device adapters ([`@teranga/device-adapters`](../../packages/device-adapters)) —
   **OBS read-only**; vMix/ATEM/NDI/FFmpeg/HyperDeck/EVS are stubs.
3. Runs the `ConnectionManager` (heartbeat + backoff reconnect) and polls device
   status every 5s.
4. Gathers system health (CPU, memory, disk, network, realtime latency).
5. Reports a heartbeat to the platform (Kernel AgentRegistry) via Supabase using
   the service role. Operators read it live (Device Dashboard / System Health).

## Run

```bash
cp .env.example .env   # fill in Supabase + OBS + org id
pnpm --filter @teranga/agent start     # tsx src/index.ts
# or: pnpm --filter @teranga/agent dev # watch mode
```

The Agent uses a stable `AGENT_KEY` (defaults to hostname) so it upserts a single
`broadcast_agents` row per workstation. On the web side, the agent and OBS appear
automatically and the device dashboard updates live.

## Boundaries

The Agent **owns hardware**; the web app **owns operators**. It writes only the
Kernel AgentRegistry tables (`broadcast_agents`, `agent_devices`) and never
touches Production, Replay, or Graphics tables. See
[ENGINE_SPECIFICATIONS](../../docs/ENGINE_SPECIFICATIONS.md).
