"use client";

import { StatusCard, type StatusState } from "@/components/production/status-card";
import { useDevices } from "./use-devices";
import {
  isAgentLive,
  secondsAgo,
  type AgentRow,
  type DeviceRow,
} from "@/features/devices/types";

function deviceState(d: DeviceRow | undefined, live: boolean): StatusState {
  if (!d || !live) return "offline";
  if (d.status === "connected") return "connected";
  if (d.status === "connecting") return "connecting";
  if (d.status === "error") return "warn";
  return "offline";
}

export function DeviceDashboard({
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
      <div>
        <div className="status" style={{ marginBottom: "0.8rem" }}>
          <span className="status__dot status__dot--offline" />
          Aucun agent Teranga connecté
        </div>
        <div className="scard-grid">
          <StatusCard label="OBS" state="offline" />
          <StatusCard label="Agent" state="offline" />
          <StatusCard label="Recording" state="idle" value="—" />
          <StatusCard label="Streaming" state="idle" value="—" />
        </div>
        <p className="dim" style={{ fontSize: "0.78rem", marginTop: "0.7rem" }}>
          Démarrez l&apos;agent sur le poste de production : il apparaîtra ici
          automatiquement.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      {agents.map((agent) => {
        const live = isAgentLive(agent, nowMs);
        const obs = devices.find(
          (d) => d.agentId === agent.id && d.deviceType === "obs",
        );
        const s = obs?.stats ?? {};
        const obsState = deviceState(obs, live);

        return (
          <div key={agent.id}>
            <div
              className="row"
              style={{ justifyContent: "space-between", marginBottom: "0.6rem" }}
            >
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
              <StatusCard
                label="OBS"
                state={obsState}
                value={obsState === "connected" ? `v${s.version ?? "?"}` : undefined}
              />
              <StatusCard
                label="Recording"
                state={live && s.recording ? "connected" : "idle"}
                value={live ? (s.recording ? "ON" : "OFF") : "—"}
              />
              <StatusCard
                label="Streaming"
                state={live && s.streaming ? "connected" : "idle"}
                value={live ? (s.streaming ? "ON" : "OFF") : "—"}
              />
              <StatusCard
                label="FPS"
                state={obsState === "connected" ? "connected" : "idle"}
                value={s.fps != null ? String(s.fps) : "—"}
                mono
              />
              <StatusCard
                label="Dropped"
                state={(s.droppedFrames ?? 0) > 0 ? "warn" : obsState === "connected" ? "connected" : "idle"}
                value={s.droppedFrames != null ? String(s.droppedFrames) : "—"}
                mono
              />
              <StatusCard
                label="CPU"
                state={obsState === "connected" ? "connected" : "idle"}
                value={s.cpuUsage != null ? `${s.cpuUsage}%` : "—"}
                mono
              />
              <StatusCard
                label="Bitrate"
                state={obsState === "connected" ? "connected" : "idle"}
                value={s.bitrate != null ? `${s.bitrate} kbps` : "—"}
                mono
              />
              <StatusCard
                label="Encoder"
                state="idle"
                value={s.encoder ?? "—"}
              />
              <StatusCard
                label="Scène"
                state={obsState === "connected" ? "connected" : "idle"}
                value={s.currentScene ?? "—"}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
