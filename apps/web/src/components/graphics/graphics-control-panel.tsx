"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useGraphicsState } from "./use-graphics-state";
import {
  setScorebugVisible,
  showLowerThird,
  hideGraphic,
  showEventGraphic,
  saveInstance,
  deleteInstance,
} from "@/features/graphics/actions";
import {
  EVENT_GRAPHIC,
  type EventGraphicType,
  type GraphicsState,
  type LowerThirdData,
} from "@/features/graphics/types";
import type { GraphicsInstance } from "@/features/graphics/queries";

const EVENT_TYPES: EventGraphicType[] = [
  "goal",
  "yellow_card",
  "red_card",
  "substitution",
  "var",
  "halftime",
  "fulltime",
];

const EMPTY_LT: LowerThirdData = { name: "", role: "", stat: "", team: null };

export function GraphicsControlPanel({
  matchId,
  initialGraphics,
  instances,
}: {
  matchId: string;
  initialGraphics: GraphicsState;
  instances: GraphicsInstance[];
}) {
  const graphics = useGraphicsState(matchId, initialGraphics);
  const [pending, startTransition] = useTransition();
  const [lt, setLt] = useState<LowerThirdData>(
    initialGraphics.lowerThird.data.name ? initialGraphics.lowerThird.data : EMPTY_LT,
  );
  const [eventLabel, setEventLabel] = useState("");

  const lowerThirdInstances = instances.filter((i) => i.kind === "lower_third");

  return (
    <div style={{ display: "grid", gap: "1.1rem" }}>
      {/* Scorebug */}
      <section className="panel">
        <div className="panel__header">
          <span className="panel__title">Scorebug</span>
          <ActiveDot on={graphics.scorebug} />
        </div>
        <div className="panel__body row" style={{ gap: "0.6rem" }}>
          <button
            className={`btn ${graphics.scorebug ? "btn--primary" : ""}`}
            disabled={pending}
            onClick={() => startTransition(() => setScorebugVisible(matchId, true))}
          >
            Afficher
          </button>
          <button
            className="btn"
            disabled={pending}
            onClick={() => startTransition(() => setScorebugVisible(matchId, false))}
          >
            Masquer
          </button>
        </div>
      </section>

      {/* Lower third */}
      <section className="panel">
        <div className="panel__header">
          <span className="panel__title">Lower third</span>
          <ActiveDot on={graphics.lowerThird.visible} />
        </div>
        <div className="panel__body" style={{ display: "grid", gap: "0.7rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
            <Field label="Nom">
              <input
                className="input"
                value={lt.name}
                onChange={(e) => setLt({ ...lt, name: e.target.value })}
                placeholder="SADIO MANÉ"
              />
            </Field>
            <Field label="Rôle / titre">
              <input
                className="input"
                value={lt.role}
                onChange={(e) => setLt({ ...lt, role: e.target.value })}
                placeholder="Buteur"
              />
            </Field>
            <Field label="Statistique">
              <input
                className="input"
                value={lt.stat}
                onChange={(e) => setLt({ ...lt, stat: e.target.value })}
                placeholder="43'"
              />
            </Field>
            <Field label="Équipe">
              <select
                className="select"
                value={lt.team ?? ""}
                onChange={(e) =>
                  setLt({ ...lt, team: (e.target.value || null) as LowerThirdData["team"] })
                }
              >
                <option value="">—</option>
                <option value="home">Domicile</option>
                <option value="away">Extérieur</option>
              </select>
            </Field>
          </div>

          <div className="row" style={{ gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              className="btn btn--primary"
              disabled={pending || !lt.name}
              onClick={() => startTransition(() => showLowerThird(matchId, lt))}
            >
              Afficher
            </button>
            <button
              className="btn"
              disabled={pending}
              onClick={() => startTransition(() => hideGraphic(matchId, "lower_third"))}
            >
              Masquer
            </button>
            <button
              className="btn btn--ghost"
              disabled={pending || !lt.name}
              onClick={() =>
                startTransition(() =>
                  saveInstance(matchId, "lower_third", lt.name, lt as unknown as Record<string, unknown>),
                )
              }
            >
              Enregistrer le préréglage
            </button>
          </div>

          {lowerThirdInstances.length > 0 ? (
            <div className="preset-list">
              {lowerThirdInstances.map((i) => (
                <span key={i.id} className="preset">
                  <button
                    className="preset__load"
                    onClick={() => setLt({ ...EMPTY_LT, ...(i.payload as LowerThirdData) })}
                    title="Charger"
                  >
                    {i.label}
                  </button>
                  <button
                    className="preset__del"
                    disabled={pending}
                    onClick={() => startTransition(() => deleteInstance(i.id, matchId))}
                    title="Supprimer"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {/* Event graphics */}
      <section className="panel">
        <div className="panel__header">
          <span className="panel__title">Graphiques d&apos;événement</span>
          <ActiveDot on={graphics.event.visible} />
        </div>
        <div className="panel__body" style={{ display: "grid", gap: "0.7rem" }}>
          <Field label="Texte (optionnel — buteur, joueur…)">
            <input
              className="input"
              value={eventLabel}
              onChange={(e) => setEventLabel(e.target.value)}
              placeholder="Sadio Mané · 43'"
            />
          </Field>
          <div className="ev-grid">
            {EVENT_TYPES.map((t) => (
              <button
                key={t}
                className="btn"
                disabled={pending}
                onClick={() =>
                  startTransition(() => showEventGraphic(matchId, t, eventLabel))
                }
              >
                {EVENT_GRAPHIC[t].title}
              </button>
            ))}
            <button
              className="btn btn--ghost"
              disabled={pending}
              onClick={() => startTransition(() => hideGraphic(matchId, "event"))}
            >
              Masquer
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function ActiveDot({ on }: { on: boolean }) {
  return (
    <span className="status">
      <span className={`status__dot ${on ? "status__dot--live" : "status__dot--idle"}`} />
      {on ? "À l'antenne" : "Masqué"}
    </span>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      {children}
    </label>
  );
}
