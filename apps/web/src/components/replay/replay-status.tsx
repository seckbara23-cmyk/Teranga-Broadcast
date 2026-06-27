"use client";

import { StatusCard } from "@/components/production/status-card";
import type { BufferStatus } from "@/features/replay/clip-types";

function fmtBytes(n: number): string {
  if (!n) return "0 B";
  const u = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(u.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  return `${(n / 1024 ** i).toFixed(1)} ${u[i]}`;
}

function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/** Replay status dashboard. Buffer/segment/archive from server; clip & queue
 *  counts live from the workspace. */
export function ReplayStatus({
  status,
  clipCount,
  queueCount,
}: {
  status: BufferStatus;
  clipCount: number;
  queueCount: number;
}) {
  return (
    <div className="scard-grid">
      <StatusCard
        label="Buffer"
        state={status.recording ? "connected" : "offline"}
        value={status.recording ? "Enregistre" : "Arrêté"}
      />
      <StatusCard label="Segments" state="idle" value={String(status.segmentCount)} mono />
      <StatusCard label="Disque" state="idle" value={fmtBytes(status.diskBytes)} mono />
      <StatusCard label="Plus ancien" state="idle" value={fmtTime(status.oldestSegmentAt)} mono />
      <StatusCard label="Plus récent" state="idle" value={fmtTime(status.newestSegmentAt)} mono />
      <StatusCard label="Clips" state="idle" value={String(clipCount)} mono />
      <StatusCard label="File" state="idle" value={String(queueCount)} mono />
      <StatusCard label="Archive" state="idle" value={String(status.archiveCount)} mono />
    </div>
  );
}
