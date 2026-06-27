import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_GRAPHICS_STATE,
  type GraphicsState,
  type LowerThirdData,
  type EventGraphicData,
} from "./types";

export async function getActiveGraphics(matchId: string): Promise<GraphicsState> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("graphics_overlays")
    .select("slot, visible, payload")
    .eq("match_id", matchId);

  const state: GraphicsState = {
    scorebug: DEFAULT_GRAPHICS_STATE.scorebug,
    lowerThird: { ...DEFAULT_GRAPHICS_STATE.lowerThird },
    event: { ...DEFAULT_GRAPHICS_STATE.event },
  };

  for (const row of (data ?? []) as any[]) {
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
        data: (row.payload?.type ? (row.payload as EventGraphicData) : null),
      };
    }
  }
  return state;
}

export type GraphicsInstance = {
  id: string;
  kind: "lower_third" | "event";
  label: string;
  payload: any;
};

export async function listInstances(matchId: string): Promise<GraphicsInstance[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("graphics_instances")
    .select("id, kind, label, payload")
    .eq("match_id", matchId)
    .order("created_at", { ascending: false });
  return (data ?? []) as GraphicsInstance[];
}
