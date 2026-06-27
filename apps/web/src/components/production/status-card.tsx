/**
 * Reusable status widget. Future engines (Replay, Graphics, Agent) feed real
 * values; in Phase 2 most report an honest idle/offline state.
 */
export type StatusState = "connected" | "offline" | "connecting" | "warn" | "idle";

const DOT: Record<StatusState, string> = {
  connected: "status__dot--ok",
  offline: "status__dot--offline",
  connecting: "status__dot--info",
  warn: "status__dot--warn",
  idle: "status__dot--idle",
};

const STATE_LABEL: Record<StatusState, string> = {
  connected: "Connecté",
  offline: "Hors ligne",
  connecting: "Connexion…",
  warn: "Attention",
  idle: "Inactif",
};

export function StatusCard({
  label,
  state,
  value,
  mono,
}: {
  label: string;
  state: StatusState;
  value?: string;
  mono?: boolean;
}) {
  return (
    <div className="scard">
      <span className="scard__label">{label}</span>
      <span className="scard__value">
        <span className={`status__dot ${DOT[state]}`} />
        <span className={mono ? "mono" : undefined}>{value ?? STATE_LABEL[state]}</span>
      </span>
    </div>
  );
}
