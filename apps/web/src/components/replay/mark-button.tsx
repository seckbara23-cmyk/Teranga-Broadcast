"use client";

import { useTransition } from "react";
import { useProduction } from "@/components/production/production-provider";
import { eventClockLabel } from "@/features/production/clock";
import { createMark } from "@/features/replay/actions";
import {
  MARK_TYPE_ICON,
  MARK_TYPE_LABEL,
  type ReplayMarkType,
} from "@/features/replay/types";

const TYPES: ReplayMarkType[] = [
  "goal",
  "penalty",
  "var",
  "save",
  "chance",
  "corner",
  "free_kick",
  "card",
  "substitution",
  "crowd",
  "celebration",
  "custom",
];

/**
 * MARK button + type grid. The match clock is CONSUMED from the Production
 * context (useProduction) — Replay never reads match_clock directly.
 */
export function MarkButton() {
  const { matchId, clock, displayMs } = useProduction();
  const [pending, startTransition] = useTransition();

  function mark(type: ReplayMarkType) {
    const label = eventClockLabel(displayMs, clock.periodRegulationMin);
    startTransition(() =>
      createMark({ matchId, type, matchClockMs: displayMs, clockLabel: label }),
    );
  }

  return (
    <div className="mark-pad">
      <button
        className="mark-btn"
        disabled={pending}
        onClick={() => mark("custom")}
        title="Créer un repère (M)"
      >
        <span className="mark-btn__icon">⦿</span>
        <span>MARK</span>
        <span className="kbd">M</span>
      </button>

      <div className="mark-types">
        {TYPES.map((t) => (
          <button
            key={t}
            className="qbtn"
            disabled={pending}
            onClick={() => mark(t)}
          >
            <span className="qbtn__icon">{MARK_TYPE_ICON[t]}</span>
            <span className="qbtn__label">{MARK_TYPE_LABEL[t]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
