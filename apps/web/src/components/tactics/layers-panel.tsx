"use client";

import { useTransition } from "react";
import {
  createLayer,
  updateLayer,
  deleteLayer,
  clearLayer,
} from "@/features/tactics/actions";
import type { TacticalLayer } from "@/features/tactics/types";

export function LayersPanel({
  sessionId,
  matchId,
  layers,
  activeLayerId,
  onActivate,
}: {
  sessionId: string;
  matchId: string;
  layers: TacticalLayer[];
  activeLayerId: string | null;
  onActivate: (id: string) => void;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div style={{ display: "grid", gap: "0.5rem" }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <span className="panel__title">Calques</span>
        <button
          className="btn btn--ghost"
          disabled={pending}
          onClick={() => startTransition(() => createLayer(sessionId, matchId, "Calque", "custom"))}
        >
          + Calque
        </button>
      </div>
      <ul className="tac-layers">
        {[...layers].reverse().map((l) => (
          <li
            key={l.id}
            className={`tac-layer ${activeLayerId === l.id ? "tac-layer--on" : ""}`}
            onClick={() => onActivate(l.id)}
          >
            <button
              className="iconbtn"
              title={l.visible ? "Masquer" : "Afficher"}
              onClick={(e) => {
                e.stopPropagation();
                startTransition(() => updateLayer(l.id, matchId, { visible: !l.visible }));
              }}
            >
              {l.visible ? "👁" : "🚫"}
            </button>
            <button
              className="iconbtn"
              title={l.locked ? "Déverrouiller" : "Verrouiller"}
              onClick={(e) => {
                e.stopPropagation();
                startTransition(() => updateLayer(l.id, matchId, { locked: !l.locked }));
              }}
            >
              {l.locked ? "🔒" : "🔓"}
            </button>
            <span className="tac-layer__name">{l.name}</span>
            <button
              className="iconbtn"
              title="Vider le calque"
              onClick={(e) => {
                e.stopPropagation();
                startTransition(() => clearLayer(l.id, matchId));
              }}
            >
              ⌦
            </button>
            <button
              className="iconbtn iconbtn--danger"
              title="Supprimer"
              onClick={(e) => {
                e.stopPropagation();
                startTransition(() => deleteLayer(l.id, matchId));
              }}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
