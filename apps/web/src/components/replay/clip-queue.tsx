"use client";

import { useTransition } from "react";
import {
  moveQueueItem,
  duplicateQueueItem,
  renameQueueItem,
  deleteQueueItem,
  setQueueItemStatus,
} from "@/features/replay/clip-actions";
import {
  QUEUE_STATUS_DOT,
  QUEUE_STATUS_LABEL,
  cameraLabel,
  type ClipQueueItem,
} from "@/features/replay/clip-types";

const STATUSES: ClipQueueItem["status"][] = [
  "queued",
  "ready",
  "replay_later",
  "played",
  "skipped",
];

export function ClipQueue({
  matchId,
  queue,
}: {
  matchId: string;
  queue: ClipQueueItem[];
}) {
  const [pending, startTransition] = useTransition();

  if (queue.length === 0) {
    return <div className="empty">File vide. Mettez un clip en file depuis la liste.</div>;
  }

  return (
    <table className="rq">
      <thead>
        <tr>
          {["#", "Clip", "Caméra", "Durée", "Statut", "Actions"].map((h) => (
            <th key={h}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {queue.map((it, i) => (
          <tr key={it.id} className="rq__row">
            <td className="mono dim">{i + 1}</td>
            <td>{it.name || it.clip?.name || it.clip?.clipType || "Clip"}</td>
            <td className="dim">{cameraLabel(it.clip?.cameraId ?? null)}</td>
            <td className="mono">{it.clip?.durationS ?? "—"}s</td>
            <td>
              <span className="status">
                <span className={`status__dot ${QUEUE_STATUS_DOT[it.status]}`} />
                <select
                  className="rq__status"
                  value={it.status}
                  disabled={pending}
                  onChange={(e) =>
                    startTransition(() =>
                      setQueueItemStatus(it.id, matchId, e.target.value as ClipQueueItem["status"]),
                    )
                  }
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{QUEUE_STATUS_LABEL[s]}</option>
                  ))}
                </select>
              </span>
            </td>
            <td>
              <div className="rq__actions">
                <button className="iconbtn" title="Monter" disabled={pending || i === 0}
                  onClick={() => startTransition(() => moveQueueItem(it.id, "up"))}>↑</button>
                <button className="iconbtn" title="Descendre" disabled={pending || i === queue.length - 1}
                  onClick={() => startTransition(() => moveQueueItem(it.id, "down"))}>↓</button>
                <button className="iconbtn" title="Dupliquer" disabled={pending}
                  onClick={() => startTransition(() => duplicateQueueItem(it.id, matchId))}>⎘</button>
                <button className="iconbtn" title="Renommer" disabled={pending}
                  onClick={() => {
                    const name = window.prompt("Nom :", it.name ?? "");
                    if (name != null) startTransition(() => renameQueueItem(it.id, matchId, name));
                  }}>✎</button>
                <button className="iconbtn iconbtn--danger" title="Retirer" disabled={pending}
                  onClick={() => startTransition(() => deleteQueueItem(it.id, matchId))}>✕</button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
