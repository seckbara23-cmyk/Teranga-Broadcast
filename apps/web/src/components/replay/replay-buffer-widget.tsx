import { StatusCard } from "@/components/production/status-card";

/**
 * Replay Buffer widget. NO fake data — every value is a placeholder until the
 * Replay Agent (OBS Replay Buffer / vMix / HyperDeck / NDI / FFmpeg) connects.
 */
export function ReplayBufferWidget() {
  return (
    <div>
      <div
        className="row"
        style={{ justifyContent: "space-between", marginBottom: "0.7rem" }}
      >
        <span className="status">
          <span className="status__dot status__dot--offline" />
          Aucun agent replay connecté
        </span>
      </div>
      <div className="scard-grid">
        <StatusCard label="Buffer" state="idle" value="Indisponible" />
        <StatusCard label="Recording" state="idle" value="Arrêté" />
        <StatusCard label="Durée" state="idle" value="—" mono />
        <StatusCard label="Disque" state="idle" value="—" mono />
        <StatusCard label="Frames" state="idle" value="—" mono />
        <StatusCard label="Latence" state="idle" value="—" mono />
        <StatusCard label="Agent" state="offline" />
      </div>
    </div>
  );
}
