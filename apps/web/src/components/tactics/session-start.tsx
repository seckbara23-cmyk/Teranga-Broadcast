"use client";

import Link from "next/link";
import { useTransition } from "react";
import {
  createSessionFromClip,
  createBlankSession,
} from "@/features/tactics/actions";
import type { TacticalSession } from "@/features/tactics/types";

export function SessionStart({
  matchId,
  clips,
  sessions,
}: {
  matchId: string;
  clips: { id: string; label: string; thumbnailPath: string | null }[];
  sessions: TacticalSession[];
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div style={{ display: "grid", gap: "1.1rem", maxWidth: "60rem" }}>
      <section className="panel">
        <div className="panel__header">
          <span className="panel__title">Analyser un clip replay</span>
          <button className="btn btn--ghost" disabled={pending} onClick={() => startTransition(() => createBlankSession(matchId))}>
            Terrain vierge
          </button>
        </div>
        <div className="panel__body">
          {clips.length === 0 ? (
            <div className="empty">
              Aucun clip replay disponible. Créez un clip depuis l&apos;onglet Replay, puis analysez-le.
            </div>
          ) : (
            <div className="tac-clips">
              {clips.map((c) => (
                <button
                  key={c.id}
                  className="tac-clipcard"
                  disabled={pending}
                  onClick={() => startTransition(() => createSessionFromClip(matchId, c.id))}
                  title="Geler l'image et ouvrir l'atelier tactique"
                >
                  <span className="tac-clipcard__thumb">
                    {c.thumbnailPath ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.thumbnailPath} alt="" />
                    ) : (
                      <span className="dim">▦</span>
                    )}
                  </span>
                  <span className="tac-clipcard__label">{c.label || "Clip"}</span>
                  <span className="tac-clipcard__cta">Analyser →</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {sessions.length > 0 ? (
        <section className="panel">
          <div className="panel__header">
            <span className="panel__title">Analyses récentes</span>
          </div>
          <div className="panel__body">
            <ul className="clip-list">
              {sessions.map((s) => (
                <li key={s.id} className="clip-row">
                  <span className="status__dot status__dot--idle" />
                  <Link href={`/matches/${matchId}/tactics?session=${s.id}`} className="clip-row__name">
                    {s.title}
                  </Link>
                  <span className="dim mono" style={{ fontSize: "0.72rem" }}>{s.clockLabel ?? ""}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </div>
  );
}
