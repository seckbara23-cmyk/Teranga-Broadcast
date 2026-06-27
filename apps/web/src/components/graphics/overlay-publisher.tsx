"use client";

import { useEffect, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useProduction } from "@/components/production/production-provider";
import { useGraphicsState } from "./use-graphics-state";
import {
  REALTIME_OVERLAY_CHANNEL,
  type GraphicsState,
  type OverlayPayload,
} from "@/features/graphics/types";

/**
 * Publishes the merged overlay state (Production clock/score/status + Graphics
 * show/hide) to the public broadcast channel the OBS overlay subscribes to.
 *
 * Mounted in the match layout so the overlay stays live on any tab. Reads
 * Production via context (never its tables). Sends on change + a 2s heartbeat
 * so late-joining overlays (a freshly opened OBS source) catch up quickly.
 */
export function OverlayPublisher({
  initialGraphics,
}: {
  initialGraphics: GraphicsState;
}) {
  const { matchId, clock, score, teams, competition } = useProduction();
  const graphics = useGraphicsState(matchId, initialGraphics);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  // Memoised on real changes only (NOT the per-tick nowMs) to avoid flooding.
  const payload = useMemo<OverlayPayload>(
    () => ({ teams, competition, clock, score, graphics }),
    [teams, competition, clock, score, graphics],
  );

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(REALTIME_OVERLAY_CHANNEL(matchId), {
      config: { broadcast: { self: false } },
    });
    channel.subscribe();
    channelRef.current = channel;
    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [matchId]);

  useEffect(() => {
    function send() {
      channelRef.current?.send({ type: "broadcast", event: "state", payload });
    }
    send();
    const id = setInterval(send, 2000);
    return () => clearInterval(id);
  }, [payload]);

  return null;
}
