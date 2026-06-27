"use client";

import { useEffect, useState } from "react";
import { useTactics } from "./use-tactics";
import { TacticsCanvas } from "./tactics-canvas";
import { TacticsToolbar } from "./tactics-toolbar";
import { LayersPanel } from "./layers-panel";
import { AnalysisDashboard } from "./analysis-dashboard";
import { FormationPicker } from "./formation-picker";
import { TeamColors } from "./team-colors";
import { ExportMenu } from "./export-menu";
import type {
  TacticalAnnotation,
  TacticalLayer,
  TacticalSession,
  ToolId,
} from "@/features/tactics/types";

export function TacticsWorkspace({
  session,
  matchId,
  initialLayers,
  initialAnnotations,
  counts,
}: {
  session: TacticalSession;
  matchId: string;
  initialLayers: TacticalLayer[];
  initialAnnotations: TacticalAnnotation[];
  counts: { cards: number; subs: number };
}) {
  const { layers, annotations } = useTactics(session.id, initialLayers, initialAnnotations);
  const [tool, setTool] = useState<ToolId>("arrow");
  const [color, setColor] = useState("#ffe600");
  const [activeLayerId, setActiveLayerId] = useState<string | null>(initialLayers[0]?.id ?? null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [presentation, setPresentation] = useState(false);

  useEffect(() => {
    if ((!activeLayerId || !layers.some((l) => l.id === activeLayerId)) && layers[0]) {
      setActiveLayerId(layers[0].id);
    }
  }, [layers, activeLayerId]);

  return (
    <div className={`tactics ${presentation ? "tactics--present" : ""}`}>
      <div className="tactics__stagewrap">
        {!presentation ? (
          <TacticsToolbar tool={tool} setTool={setTool} color={color} setColor={setColor} />
        ) : null}
        <div className="tactics__stage">
          <TacticsCanvas
            sessionId={session.id}
            matchId={matchId}
            freezeFrameUrl={session.freezeFrameUrl}
            layers={layers}
            annotations={annotations}
            activeLayerId={activeLayerId}
            tool={presentation ? "select" : tool}
            color={color}
            homeColor={session.homeColor}
            awayColor={session.awayColor}
            selectedId={selectedId}
            onSelect={setSelectedId}
            presentation={presentation}
          />
        </div>
        <div className="tactics__presentbar">
          <button className="btn" onClick={() => setPresentation((p) => !p)}>
            {presentation ? "Quitter présentation" : "Mode présentation"}
          </button>
          {presentation ? null : <ExportMenu sessionId={session.id} />}
        </div>
      </div>

      {!presentation ? (
        <aside className="tactics__side">
          <section className="panel">
            <div className="panel__body">
              <LayersPanel
                sessionId={session.id}
                matchId={matchId}
                layers={layers}
                activeLayerId={activeLayerId}
                onActivate={setActiveLayerId}
              />
            </div>
          </section>

          <section className="panel">
            <div className="panel__header">
              <span className="panel__title">Formations</span>
              <TeamColors sessionId={session.id} matchId={matchId} home={session.homeColor} away={session.awayColor} />
            </div>
            <div className="panel__body">
              <FormationPicker sessionId={session.id} matchId={matchId} activeLayerId={activeLayerId} />
            </div>
          </section>

          <section className="panel">
            <div className="panel__header">
              <span className="panel__title">Analyse</span>
            </div>
            <div className="panel__body">
              <AnalysisDashboard cards={counts.cards} subs={counts.subs} />
            </div>
          </section>
        </aside>
      ) : null}
    </div>
  );
}
