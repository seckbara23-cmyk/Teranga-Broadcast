"use client";

import { useProduction } from "./production-provider";
import { formatClock, stoppageMinutes } from "@/features/production/clock";
import { STATUS_LABEL, isLiveStatus } from "@/features/production/types";

/** The operator's primary visual reference — a large broadcast match clock. */
export function MatchClock() {
  const { clock, displayMs } = useProduction();
  const stoppage = stoppageMinutes(displayMs, clock.periodRegulationMin);
  const playable = isLiveStatus(clock.status) && clock.status !== "penalties";
  const paused = playable && !clock.running;

  return (
    <div className={`clock-xl ${clock.running ? "clock-xl--running" : ""}`}>
      <div className="clock-xl__status">
        {clock.running ? (
          <span className="status__dot status__dot--live" />
        ) : (
          <span className="status__dot status__dot--idle" />
        )}
        {STATUS_LABEL[clock.status]}
        {paused ? <span className="clock-xl__paused">PAUSE</span> : null}
      </div>

      <div className="clock-xl__time mono">
        {formatClock(displayMs)}
        {stoppage > 0 ? <span className="clock-xl__stoppage">+{stoppage}</span> : null}
      </div>
    </div>
  );
}
