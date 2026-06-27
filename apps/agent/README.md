# @teranga/agent

The **Teranga Agent** — a local edge service that runs on the production machine
next to OBS. It owns the **media plane**: everything a browser sandbox cannot do
reliably.

> Status: **placeholder structure** only. The entry point logs and exits — no
> OBS, replay, or FFmpeg logic is implemented yet.

## Responsibilities (planned)

- Hold a persistent, reconnecting **OBS WebSocket v5** session (via `@teranga/obs`).
- Manage the **segmented replay ring buffer** on local disk (cut planning from
  `@teranga/replay`; FFmpeg execution here).
- Run **export jobs** (FFmpeg trim + branding burn-in) and register **assets**.
- Subscribe to **Supabase Realtime** for commands; report status/health back.
- Monitor **disk, CPU, and dropped frames**; raise loud alarms.

## Planned `src/` layout

```
src/
├── obs/       OBS session + scene/source control
├── replay/    ring-buffer recorder, segment index, clip cut (uses @teranga/replay)
├── export/    FFmpeg job runner, branding burn-in
├── sync/      Supabase Realtime subscribe + status reporting
├── assets/    file registry → Storage upload
├── health/    disk / CPU / dropped-frame monitoring
└── index.ts   service bootstrap
```

## Configuration

Copy `.env.example` → `.env`. The OBS password and Supabase service key live
**only** on this machine — never committed or synced. Point `SUPABASE_URL` at a
self-hosted instance for on-prem deployments.

## Why a separate service

The browser cannot hold a persistent OBS connection, manage large local recording
files, or invoke FFmpeg. The Agent does — and it keeps recording and replaying
**even if the cloud is unreachable**, which matters for RTS Senegal connectivity.
See [docs/03-system-architecture.md](../../docs/03-system-architecture.md).
