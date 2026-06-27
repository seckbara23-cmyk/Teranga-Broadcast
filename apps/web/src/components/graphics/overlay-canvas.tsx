"use client";

import type { CSSProperties } from "react";
import { formatClock, currentHalfLabel } from "@/features/production/clock";
import { STATUS_LABEL } from "@/features/production/types";
import { EVENT_GRAPHIC, type OverlayPayload } from "@/features/graphics/types";
import { teamInitials } from "@/lib/flags";

/**
 * Pure presentational broadcast overlay. Rendered both on the public OBS route
 * and in the operator preview. Sized with container-query units (cqh/cqw) so it
 * scales identically at any size. 16:9, safe-area aware, transparent.
 */
export function OverlayCanvas({
  payload,
  displayMs,
}: {
  payload: OverlayPayload;
  displayMs: number | null;
}) {
  const { teams, competition, score, clock, graphics } = payload;
  const half = currentHalfLabel(clock, displayMs);

  return (
    <div className="ov-stage">
      {/* Scorebug — top-left */}
      {graphics.scorebug ? (
        <div className="ov-sb">
          <div className="ov-sb__main">
            <span className="ov-sb__flag">{teams.homeFlag ?? "🏳️"}</span>
            <span className="ov-sb__abbr">{teamInitials(teams.home)}</span>
            <span className="ov-sb__score">{score.home}</span>
            <span className="ov-sb__sep">·</span>
            <span className="ov-sb__score">{score.away}</span>
            <span className="ov-sb__abbr">{teamInitials(teams.away)}</span>
            <span className="ov-sb__flag">{teams.awayFlag ?? "🏳️"}</span>
          </div>
          <div className="ov-sb__clockbar">
            <span className="ov-sb__time mono">{formatClock(displayMs)}</span>
            <span className="ov-sb__dot" />
            <span className="ov-sb__status">
              {half !== "—" ? `${half} · ` : ""}
              {STATUS_LABEL[clock.status]}
            </span>
          </div>
          {score.shHome > 0 || score.shAway > 0 ? (
            <div className="ov-sb__pens">
              T.A.B. {score.shHome}–{score.shAway}
            </div>
          ) : null}
          {competition ? <div className="ov-sb__comp">{competition}</div> : null}
        </div>
      ) : null}

      {/* Lower third — bottom-left */}
      {graphics.lowerThird.visible && graphics.lowerThird.data.name ? (
        <div className="ov-lt" key={`lt-${graphics.lowerThird.data.name}`}>
          <div
            className={`ov-lt__accent ${
              graphics.lowerThird.data.team === "away" ? "ov-lt__accent--away" : ""
            }`}
          />
          <div className="ov-lt__body">
            <div className="ov-lt__name">{graphics.lowerThird.data.name}</div>
            <div className="ov-lt__role">
              {[graphics.lowerThird.data.role, graphics.lowerThird.data.stat]
                .filter(Boolean)
                .join(" · ")}
            </div>
          </div>
        </div>
      ) : null}

      {/* Event graphic — centre */}
      {graphics.event.visible && graphics.event.data ? (
        <div
          className="ov-ev"
          key={`ev-${graphics.event.data.type}-${graphics.event.data.label}`}
          style={
            {
              ["--ev-accent" as string]: EVENT_GRAPHIC[graphics.event.data.type].accent,
            } as CSSProperties
          }
        >
          <div className="ov-ev__title">
            {EVENT_GRAPHIC[graphics.event.data.type].title}
          </div>
          {graphics.event.data.label ? (
            <div className="ov-ev__label">{graphics.event.data.label}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
