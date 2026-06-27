import { StatusCard, type StatusState } from "./status-card";

type Card = { label: string; state: StatusState; value?: string; mono?: boolean };

/**
 * Production status board. Phase 2 reports honest placeholders; the OBS Agent
 * (Phase 7) and Replay Engine (Phase 3) populate live values via the event spine.
 */
export function StatusGrid({ fps }: { fps?: number | null }) {
  const cards: Card[] = [
    { label: "OBS", state: "offline" },
    { label: "Agent", state: "offline" },
    { label: "Replay", state: "idle", value: "Indisponible" },
    { label: "Recording", state: "idle", value: "Arrêté" },
    { label: "Streaming", state: "idle", value: "Arrêté" },
    { label: "Encoder", state: "idle", value: "—" },
    { label: "FPS", state: "idle", value: fps ? String(fps) : "—", mono: true },
    { label: "Dropped Frames", state: "idle", value: "—", mono: true },
    { label: "Bitrate", state: "idle", value: "—", mono: true },
    { label: "Disk", state: "idle", value: "—", mono: true },
    { label: "GPU", state: "idle", value: "—", mono: true },
    { label: "CPU", state: "idle", value: "—", mono: true },
  ];

  return (
    <div className="scard-grid">
      {cards.map((c) => (
        <StatusCard key={c.label} label={c.label} state={c.state} value={c.value} mono={c.mono} />
      ))}
    </div>
  );
}
