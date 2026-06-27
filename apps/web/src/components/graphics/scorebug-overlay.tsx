"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { computeDisplayMs } from "@/features/production/clock";
import {
  REALTIME_OVERLAY_CHANNEL,
  type OverlayPayload,
} from "@/features/graphics/types";
import { OverlayCanvas } from "./overlay-canvas";

/**
 * Public OBS overlay surface. Transparent, broadcast-driven: it renders nothing
 * but the graphics, subscribes to the overlay broadcast channel, and ticks the
 * clock locally between updates. No table access — data arrives via broadcast.
 */
export function ScorebugOverlay({ matchId }: { matchId: string }) {
  const [payload, setPayload] = useState<OverlayPayload | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  // Transparent page for OBS Browser Source capture.
  useEffect(() => {
    const prevBody = document.body.style.background;
    const prevHtml = document.documentElement.style.background;
    document.body.style.background = "transparent";
    document.documentElement.style.background = "transparent";
    return () => {
      document.body.style.background = prevBody;
      document.documentElement.style.background = prevHtml;
    };
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(REALTIME_OVERLAY_CHANNEL(matchId))
      .on("broadcast", { event: "state" }, ({ payload: p }) =>
        setPayload(p as OverlayPayload),
      )
      .subscribe();
    return () => {
      channel.unsubscribe();
    };
  }, [matchId]);

  const running = payload?.clock.running ?? false;
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNowMs(Date.now()), 250);
    return () => clearInterval(id);
  }, [running]);

  const displayMs = useMemo(
    () => (payload ? computeDisplayMs(payload.clock, nowMs) : 0),
    [payload, nowMs],
  );

  if (!payload) return null;

  return (
    <div className="overlay-viewport">
      <div className="overlay-frame">
        <OverlayCanvas payload={payload} displayMs={displayMs} />
      </div>
    </div>
  );
}
