import { notFound } from "next/navigation";
import { getMatch } from "@/features/matches/queries";

export const dynamic = "force-dynamic";

/**
 * Production Console — the operator's per-match operating frame.
 *
 * Phase 1 establishes the environment; device control (OBS/Agent) and the
 * Replay/Graphics engines are NOT wired yet. Status surfaces therefore report an
 * honest "not connected" state — they are the slots future engines fill.
 */
export default async function ProductionConsolePage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  const match = await getMatch(matchId);
  if (!match) notFound();

  return (
    <div style={{ display: "grid", gap: "1.1rem" }}>
      {/* Transport bar */}
      <div
        className="panel"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          padding: "0.85rem 1rem",
        }}
      >
        <div className="row" style={{ gap: "1.25rem" }}>
          <div style={{ display: "grid" }}>
            <span className="tile__label">Antenne</span>
            <span className="row" style={{ gap: "0.5rem", marginTop: "0.3rem" }}>
              <span className="status__dot status__dot--idle" />
              <span className="mono" style={{ fontWeight: 700 }}>
                HORS ANTENNE
              </span>
            </span>
          </div>
          <div style={{ display: "grid" }}>
            <span className="tile__label">Horloge match</span>
            <span
              className="mono"
              style={{ fontSize: "1.6rem", fontWeight: 600, lineHeight: 1.1 }}
            >
              00:00
            </span>
          </div>
        </div>

        <div className="row">
          <button className="btn" disabled title="Agent local requis (à venir)">
            Démarrer l&apos;enregistrement
          </button>
          <button
            className="btn btn--primary"
            disabled
            title="Agent local requis (à venir)"
          >
            Passer à l&apos;antenne
          </button>
        </div>
      </div>

      {/* Status tiles */}
      <div className="grid-tiles">
        <StatusTile label="Agent local" value="Hors ligne" dot="idle" />
        <StatusTile label="OBS" value="Non connecté" dot="idle" />
        <StatusTile label="Enregistrement" value="Arrêté" dot="idle" />
        <StatusTile label="Diffusion" value="Arrêtée" dot="idle" />
        <StatusTile label="Images / s" value="—" dot="idle" mono />
        <StatusTile label="Images perdues" value="—" dot="idle" mono />
        <StatusTile label="Disque" value="—" dot="idle" mono />
        <StatusTile label="FPS source" value={match.fps ? String(match.fps) : "—"} dot="idle" mono />
      </div>

      {/* Pre-flight */}
      <div className="panel">
        <div className="panel__header">
          <span className="panel__title">Pré-vol</span>
          <span className="dim" style={{ fontSize: "0.75rem" }}>
            En attente de l&apos;agent local
          </span>
        </div>
        <div className="panel__body" style={{ display: "grid", gap: "0.5rem" }}>
          {[
            "OBS connecté",
            "Source programme active",
            "Encodeur sain (NVENC)",
            "Espace disque suffisant",
            "Overlays affichés",
            "Tampon replay en enregistrement",
          ].map((item) => (
            <div
              key={item}
              className="row"
              style={{ justifyContent: "space-between" }}
            >
              <span className="muted">{item}</span>
              <span className="status">
                <span className="status__dot status__dot--idle" />
                En attente
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatusTile({
  label,
  value,
  dot,
  mono,
}: {
  label: string;
  value: string;
  dot: "ok" | "warn" | "live" | "idle";
  mono?: boolean;
}) {
  return (
    <div className="tile">
      <span className="tile__label">{label}</span>
      <span className="row" style={{ gap: "0.5rem" }}>
        <span className={`status__dot status__dot--${dot}`} />
        <span
          className={mono ? "mono" : undefined}
          style={{ fontSize: "1.05rem", fontWeight: 600 }}
        >
          {value}
        </span>
      </span>
    </div>
  );
}
