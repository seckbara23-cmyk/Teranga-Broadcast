/**
 * Teranga Agent — local edge service entry point.
 *
 * PLACEHOLDER (foundation only — does not run real logic yet).
 *
 * The Agent runs on the production machine next to OBS and owns everything the
 * browser cannot:
 *   - a persistent OBS WebSocket v5 session (via @teranga/obs)
 *   - the segmented replay ring buffer + FFmpeg export (math from @teranga/replay)
 *   - Supabase Realtime subscribe/report (commands in, status out)
 *   - the local asset registry + Storage upload
 *   - health monitoring (disk, CPU, dropped frames)
 *
 * See docs/03-system-architecture.md and docs/07-obs-integration.md.
 */

function main(): void {
  // Intentionally empty: scaffolding only. Bootstrap wiring lands in Phase 0/1.
  console.log("[teranga-agent] placeholder — not implemented yet");
}

main();
