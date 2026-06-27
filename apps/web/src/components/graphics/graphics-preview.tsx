"use client";

import { useProduction } from "@/components/production/production-provider";
import { useGraphicsState } from "./use-graphics-state";
import { OverlayCanvas } from "./overlay-canvas";
import type { GraphicsState, OverlayPayload } from "@/features/graphics/types";

/** Operator preview of exactly what the OBS overlay shows (16:9, scaled down). */
export function GraphicsPreview({
  initialGraphics,
}: {
  initialGraphics: GraphicsState;
}) {
  const { teams, competition, clock, score, displayMs, matchId } = useProduction();
  const graphics = useGraphicsState(matchId, initialGraphics);
  const payload: OverlayPayload = { teams, competition, clock, score, graphics };

  return (
    <div className="ov-preview">
      <div className="ov-preview__frame">
        <OverlayCanvas payload={payload} displayMs={displayMs} />
      </div>
    </div>
  );
}
