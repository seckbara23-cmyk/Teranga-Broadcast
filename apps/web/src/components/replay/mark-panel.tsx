"use client";

import { useState, useTransition } from "react";
import { useProduction } from "@/components/production/production-provider";
import { eventClockLabel } from "@/features/production/clock";
import { extractClip } from "@/features/replay/clip-actions";
import {
  CAMERAS,
  CLIP_DURATIONS,
  type CameraId,
  type ClipDuration,
} from "@/features/replay/clip-types";

/** MARK panel: pick camera + clip length, press MARK to extract a clip. */
export function MarkPanel() {
  const { matchId, clock, displayMs } = useProduction();
  const [camera, setCamera] = useState<CameraId>("program");
  const [duration, setDuration] = useState<ClipDuration>(15);
  const [pending, startTransition] = useTransition();

  function mark() {
    const label = eventClockLabel(displayMs, clock.periodRegulationMin);
    startTransition(() =>
      extractClip({
        matchId,
        cameraId: camera,
        durationS: duration,
        matchClockMs: displayMs,
        clockLabel: label,
      }),
    );
  }

  return (
    <div className="mark-pad">
      <div className="row" style={{ gap: "0.4rem", flexWrap: "wrap" }}>
        <span className="tile__label">Caméra</span>
        {CAMERAS.map((c) => (
          <button
            key={c.id}
            className={`chip ${camera === c.id ? "chip--on" : ""}`}
            onClick={() => setCamera(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="row" style={{ gap: "0.4rem", flexWrap: "wrap" }}>
        <span className="tile__label">Durée</span>
        {CLIP_DURATIONS.map((d) => (
          <button
            key={d}
            className={`chip ${duration === d ? "chip--on" : ""}`}
            onClick={() => setDuration(d)}
          >
            {d}s
          </button>
        ))}
      </div>

      <button className="mark-btn" onClick={mark} disabled={pending} title="Extraire un clip (M)">
        <span className="mark-btn__icon">⦿</span>
        <span>MARK</span>
        <span className="kbd">M</span>
      </button>
    </div>
  );
}
