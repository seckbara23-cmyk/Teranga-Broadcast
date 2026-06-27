"use client";

import { useProduction } from "@/components/production/production-provider";
import { formatClock } from "@/features/production/clock";
import { STATUS_LABEL } from "@/features/production/types";

function Stat({ label, value, soon }: { label: string; value: string; soon?: boolean }) {
  return (
    <div className="tac-stat">
      <span className="tac-stat__label">
        {label}
        {soon ? <span className="tac-stat__soon">à venir</span> : null}
      </span>
      <span className="tac-stat__value mono">{value}</span>
    </div>
  );
}

/** Analysis side panel — live Production data (consumed via context) + tracked
 *  event counts + placeholders for advanced metrics (no AI / no tracking). */
export function AnalysisDashboard({
  cards,
  subs,
}: {
  cards: number;
  subs: number;
}) {
  const { score, clock, displayMs } = useProduction();

  return (
    <div className="tac-dash">
      <div className="tac-dash__grid">
        <Stat label="Score" value={`${score.home} – ${score.away}`} />
        <Stat label="Horloge" value={formatClock(displayMs)} />
        <Stat label="Statut" value={STATUS_LABEL[clock.status]} />
        <Stat label="Cartons" value={String(cards)} />
        <Stat label="Changements" value={String(subs)} />
        <Stat label="Buts" value={String(score.home + score.away)} />
        <Stat label="Possession" value="—" soon />
        <Stat label="Tirs" value="—" soon />
        <Stat label="Corners" value="—" soon />
        <Stat label="Fautes" value="—" soon />
      </div>
      <div className="tac-dash__future">
        <span className="dim" style={{ fontSize: "0.7rem" }}>Métriques avancées</span>
        <div className="tac-dash__chips">
          {["xG", "Réseau de passes", "Heat map", "Intensité de pressing", "Expected Threat"].map((m) => (
            <span key={m} className="chip" style={{ opacity: 0.6 }}>{m}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
