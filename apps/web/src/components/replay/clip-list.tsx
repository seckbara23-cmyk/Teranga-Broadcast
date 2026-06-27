"use client";

import { useTransition } from "react";
import {
  archiveClip,
  queueClip,
  addClipTag,
  renameClip,
  deleteClip,
} from "@/features/replay/clip-actions";
import {
  cameraLabel,
  type ReplayClip,
} from "@/features/replay/clip-types";

const STATUS_DOT: Record<ReplayClip["status"], string> = {
  pending: "status__dot--info",
  extracting: "status__dot--info",
  ready: "status__dot--ok",
  error: "status__dot--offline",
};

export function ClipList({
  matchId,
  clips,
  selectedId,
  onSelect,
}: {
  matchId: string;
  clips: ReplayClip[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [pending, startTransition] = useTransition();

  if (clips.length === 0) {
    return <div className="empty">Aucun clip. Appuyez sur MARK (M).</div>;
  }

  return (
    <ul className="clip-list">
      {clips.map((c) => (
        <li
          key={c.id}
          className={`clip-row ${selectedId === c.id ? "clip-row--sel" : ""}`}
          onClick={() => onSelect(c.id)}
        >
          <span className={`status__dot ${STATUS_DOT[c.status]}`} />
          <span className="mono clip-row__time">{c.clockLabel ?? "—"}</span>
          <span className="clip-row__name">
            {c.name || c.clipType}
            <span className="dim" style={{ fontWeight: 400 }}>
              {" "}· {cameraLabel(c.cameraId)} · {c.durationS}s
            </span>
          </span>
          <div className="clip-row__actions" onClick={(e) => e.stopPropagation()}>
            <button className="iconbtn" title="Mettre en file" disabled={pending}
              onClick={() => startTransition(() => queueClip(matchId, c.id, c.name ?? undefined))}>≣</button>
            <button className="iconbtn" title="Archiver" disabled={pending}
              onClick={() => startTransition(() => archiveClip(c.id, matchId))}>★</button>
            <button className="iconbtn" title="Étiqueter" disabled={pending}
              onClick={() => {
                const tag = window.prompt("Étiquette :");
                if (tag) startTransition(() => addClipTag(c.id, matchId, tag));
              }}>🏷</button>
            <button className="iconbtn" title="Renommer" disabled={pending}
              onClick={() => {
                const name = window.prompt("Nom du clip :", c.name ?? "");
                if (name != null) startTransition(() => renameClip(c.id, matchId, name));
              }}>✎</button>
            <button className="iconbtn iconbtn--danger" title="Supprimer" disabled={pending}
              onClick={() => startTransition(() => deleteClip(c.id, matchId))}>✕</button>
          </div>
        </li>
      ))}
    </ul>
  );
}
