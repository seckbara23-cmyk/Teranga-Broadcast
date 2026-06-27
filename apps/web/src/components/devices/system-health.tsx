"use client";

import { StatusCard } from "@/components/production/status-card";
import { useDevices } from "./use-devices";
import {
  isAgentLive,
  secondsAgo,
  type AgentRow,
  type DeviceRow,
} from "@/features/devices/types";

function pct(v: number | null | undefined): string {
  return v != null ? `${v}%` : "—";
}

export function SystemHealth({
  orgId,
  initialAgents,
  initialDevices,
}: {
  orgId: string;
  initialAgents: AgentRow[];
  initialDevices: DeviceRow[];
}) {
  const { agents, devices, nowMs } = useDevices(orgId, initialAgents, initialDevices);

  if (agents.length === 0) {
    return (
      <div className="empty">
        Aucun agent connecté. Démarrez l&apos;agent Teranga sur le poste de
        production — il apparaîtra ici automatiquement.
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: "1.3rem" }}>
      {agents.map((agent) => {
        const live = isAgentLive(agent, nowMs);
        const obs = devices.find(
          (d) => d.agentId === agent.id && d.deviceType === "obs",
        );
        const h = agent.health;

        return (
          <div key={agent.id} style={{ display: "grid", gap: "0.9rem" }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div className="row" style={{ gap: "0.5rem" }}>
                <span className={`status__dot ${live ? "status__dot--ok" : "status__dot--offline"}`} />
                <strong>{agent.name}</strong>
                <span className="dim" style={{ fontSize: "0.75rem" }}>
                  {agent.platform ?? ""} · v{agent.version ?? "?"}
                </span>
              </div>
              <span className="dim mono" style={{ fontSize: "0.75rem" }}>
                Battement {secondsAgo(agent.lastSeenAt, nowMs)}
              </span>
            </div>

            <div className="scard-grid">
              <StatusCard label="Agent" state={live ? "connected" : "offline"} value={live ? "En ligne" : "Hors ligne"} />
              <StatusCard label="Battement" state={live ? "connected" : "warn"} value={secondsAgo(agent.lastSeenAt, nowMs)} mono />
              <StatusCard
                label="OBS"
                state={obs?.status === "connected" && live ? "connected" : "offline"}
              />
              <StatusCard label="Replay" state="idle" value="Indisponible" />
              <StatusCard label="CPU" state={live ? "connected" : "idle"} value={pct(h.cpuPercent)} mono />
              <StatusCard label="Mémoire" state={live ? "connected" : "idle"} value={pct(h.memPercent)} mono />
              <StatusCard label="Disque" state={live ? "connected" : "idle"} value={pct(h.diskPercent)} mono />
              <StatusCard label="GPU" state="idle" value={pct(h.gpuPercent)} mono />
              <StatusCard label="Réseau" state={h.networkUp ? "connected" : "warn"} value={h.networkUp ? "Connecté" : "Coupé"} />
              <StatusCard
                label="Latence temps réel"
                state={live ? "connected" : "idle"}
                value={h.realtimeLatencyMs != null ? `${h.realtimeLatencyMs} ms` : "—"}
                mono
              />
            </div>

            {/* Replay Buffer Monitor — interface only (no replay yet). */}
            <div className="panel">
              <div className="panel__header">
                <span className="panel__title">Tampon replay</span>
                <span className="status">
                  <span className="status__dot status__dot--idle" />
                  En attente de l&apos;agent replay
                </span>
              </div>
              <div className="panel__body scard-grid">
                <StatusCard label="Recording" state="idle" value="—" />
                <StatusCard label="Buffer Size" state="idle" value="—" mono />
                <StatusCard label="Disk Usage" state="idle" value="—" mono />
                <StatusCard label="Segment Count" state="idle" value="—" mono />
                <StatusCard label="Oldest Segment" state="idle" value="—" mono />
                <StatusCard label="Newest Segment" state="idle" value="—" mono />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
