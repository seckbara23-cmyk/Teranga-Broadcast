"use client";

import type { ReactNode } from "react";
import { useProduction } from "./production-provider";
import { STATUS_LABEL, isLiveStatus } from "@/features/production/types";
import { currentHalfLabel } from "@/features/production/clock";

/** Always-visible broadcast match header: teams, score, competition, half, status. */
export function MatchHeader() {
  const { clock, score, displayMs, teams, competition } = useProduction();
  const live = isLiveStatus(clock.status);
  const half = currentHalfLabel(clock, displayMs);
  const hasShootout = score.shHome > 0 || score.shAway > 0;

  return (
    <header className="match-header">
      <div className="mh-top">
        <div className="mh-team mh-team--home">
          <span className="mh-name">{teams.home ?? "Domicile"}</span>
          <span className="mh-flag">{teams.homeFlag ?? "🏳️"}</span>
        </div>

        <div className="mh-score">
          <span className="mh-num">{score.home}</span>
          <span className="mh-sep">–</span>
          <span className="mh-num">{score.away}</span>
          {hasShootout ? (
            <span className="mh-pens">
              TAB {score.shHome}–{score.shAway}
            </span>
          ) : null}
        </div>

        <div className="mh-team mh-team--away">
          <span className="mh-flag">{teams.awayFlag ?? "🏳️"}</span>
          <span className="mh-name">{teams.away ?? "Extérieur"}</span>
        </div>
      </div>

      <div className="mh-meta">
        <Meta label="Compétition" value={competition ?? "—"} />
        <Meta label="Période" value={half} />
        <Meta
          label="Statut"
          value={
            <span className="row" style={{ gap: "0.4rem" }}>
              <span
                className={`status__dot ${
                  live ? "status__dot--live" : "status__dot--idle"
                }`}
              />
              <span style={{ fontWeight: 800 }}>{STATUS_LABEL[clock.status]}</span>
            </span>
          }
        />
      </div>
    </header>
  );
}

function Meta({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="mh-meta__item">
      <span className="mh-meta__label">{label}</span>
      <span className="mh-meta__value">{value}</span>
    </div>
  );
}
