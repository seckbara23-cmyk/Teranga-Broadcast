"use client";

import {
  useConnectionStatus,
  type ConnectionState,
} from "@/lib/realtime/use-connection-status";

const LABELS: Record<ConnectionState, { text: string; dot: string }> = {
  connected: { text: "En ligne", dot: "status__dot--ok" },
  connecting: { text: "Connexion…", dot: "status__dot--info" },
  disconnected: { text: "Hors connexion", dot: "status__dot--warn" },
  offline: { text: "Réseau coupé", dot: "status__dot--warn" },
};

/**
 * Persistent cloud (Realtime) connection indicator. Always visible in the top
 * bar so an operator instantly knows whether state is syncing.
 */
export function ConnectionStatus() {
  const state = useConnectionStatus();
  const meta = LABELS[state];
  return (
    <span className="status" title="Connexion temps réel (Supabase)">
      <span className={`status__dot ${meta.dot}`} />
      {meta.text}
    </span>
  );
}

/**
 * Agent / OBS link indicator. The Production Engine device link is not wired yet
 * (Phase 1 is the operating environment), so this honestly reports "no agent".
 * Future engines replace the static state with the real Teranga Agent heartbeat.
 */
export function AgentStatus() {
  return (
    <span className="status" title="Agent local / OBS — non connecté (à venir)">
      <span className="status__dot status__dot--idle" />
      Agent hors ligne
    </span>
  );
}
