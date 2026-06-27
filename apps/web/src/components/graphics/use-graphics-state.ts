"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  DEFAULT_GRAPHICS_STATE,
  type EventGraphicData,
  type GraphicsState,
  type LowerThirdData,
} from "@/features/graphics/types";

export function buildGraphicsState(rows: any[]): GraphicsState {
  const state: GraphicsState = {
    scorebug: DEFAULT_GRAPHICS_STATE.scorebug,
    lowerThird: { ...DEFAULT_GRAPHICS_STATE.lowerThird },
    event: { ...DEFAULT_GRAPHICS_STATE.event },
  };
  for (const row of rows) {
    if (row.slot === "scorebug") {
      state.scorebug = row.visible;
    } else if (row.slot === "lower_third") {
      state.lowerThird = {
        visible: row.visible,
        data: { ...DEFAULT_GRAPHICS_STATE.lowerThird.data, ...(row.payload as LowerThirdData) },
      };
    } else if (row.slot === "event") {
      state.event = {
        visible: row.visible,
        data: row.payload?.type ? (row.payload as EventGraphicData) : null,
      };
    }
  }
  return state;
}

/** Live graphics show/hide state for a match (Realtime). */
export function useGraphicsState(
  matchId: string,
  initial: GraphicsState,
): GraphicsState {
  const [state, setState] = useState<GraphicsState>(initial);

  const refetch = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("graphics_overlays")
      .select("slot, visible, payload")
      .eq("match_id", matchId);
    setState(buildGraphicsState(data ?? []));
  }, [matchId]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`graphics:${matchId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "graphics_overlays", filter: `match_id=eq.${matchId}` },
        () => void refetch(),
      )
      .subscribe();
    return () => {
      channel.unsubscribe();
    };
  }, [matchId, refetch]);

  return state;
}
