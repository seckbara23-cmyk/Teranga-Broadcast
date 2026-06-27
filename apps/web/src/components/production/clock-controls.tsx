"use client";

import { useTransition } from "react";
import { useProduction } from "./production-provider";
import {
  startMatch,
  startSecondHalf,
  startExtraTime,
  startPenalties,
  endFirstHalf,
  fullTime,
  pauseClock,
  resumeClock,
} from "@/features/production/actions";

type Ctrl = {
  label: string;
  icon: string;
  run: (id: string) => Promise<void>;
  variant?: "primary" | "danger" | "ghost";
};

export function ClockControls() {
  const { matchId, clock } = useProduction();
  const [pending, startTransition] = useTransition();

  const controls: Ctrl[] = [];
  const { status, running } = clock;

  if (status === "pre_match") {
    controls.push({ label: "Coup d'envoi", icon: "▶", run: startMatch, variant: "primary" });
  } else if (status === "first_half") {
    controls.push(
      running
        ? { label: "Pause", icon: "⏸", run: pauseClock }
        : { label: "Reprendre", icon: "▶", run: resumeClock, variant: "primary" },
    );
    controls.push({ label: "Fin 1re mi-temps", icon: "⏹", run: endFirstHalf, variant: "danger" });
  } else if (status === "half_time") {
    controls.push({ label: "2e mi-temps", icon: "▶", run: startSecondHalf, variant: "primary" });
  } else if (status === "second_half") {
    controls.push(
      running
        ? { label: "Pause", icon: "⏸", run: pauseClock }
        : { label: "Reprendre", icon: "▶", run: resumeClock, variant: "primary" },
    );
    controls.push({ label: "Temps plein", icon: "🏁", run: fullTime, variant: "danger" });
    controls.push({ label: "Prolongations", icon: "➕", run: startExtraTime, variant: "ghost" });
  } else if (status === "extra_time") {
    controls.push(
      running
        ? { label: "Pause", icon: "⏸", run: pauseClock }
        : { label: "Reprendre", icon: "▶", run: resumeClock, variant: "primary" },
    );
    controls.push({ label: "Tirs au but", icon: "🥅", run: startPenalties, variant: "ghost" });
    controls.push({ label: "Temps plein", icon: "🏁", run: fullTime, variant: "danger" });
  } else if (status === "penalties") {
    controls.push({ label: "Temps plein", icon: "🏁", run: fullTime, variant: "danger" });
  }

  return (
    <div className="clock-ctrls">
      {controls.length === 0 ? (
        <span className="dim" style={{ fontSize: "0.85rem" }}>
          Match terminé
        </span>
      ) : (
        controls.map((c) => (
          <button
            key={c.label}
            className={`ctrl-btn ${c.variant ? `ctrl-btn--${c.variant}` : ""}`}
            disabled={pending}
            onClick={() => startTransition(() => c.run(matchId))}
          >
            <span className="ctrl-btn__icon">{c.icon}</span>
            {c.label}
          </button>
        ))
      )}
    </div>
  );
}
