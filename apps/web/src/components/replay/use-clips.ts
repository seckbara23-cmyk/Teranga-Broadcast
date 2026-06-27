"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { mapClip, mapQueueItem } from "@/features/replay/clip-map";
import type { ClipQueueItem, ReplayClip } from "@/features/replay/clip-types";

/** Live clips + clip-based queue for a match (Realtime). */
export function useClips(
  matchId: string,
  initialClips: ReplayClip[],
  initialQueue: ClipQueueItem[],
) {
  const [clips, setClips] = useState<ReplayClip[]>(initialClips);
  const [queue, setQueue] = useState<ClipQueueItem[]>(initialQueue);

  const refetch = useCallback(async () => {
    const supabase = createClient();
    const [c, q] = await Promise.all([
      supabase
        .from("replay_clips")
        .select("*")
        .eq("match_id", matchId)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("replay_queue")
        .select(
          "id, clip_id, position, status, name, replay_clips(camera_id, clock_label, duration_s, status, name, clip_type)",
        )
        .eq("match_id", matchId)
        .not("clip_id", "is", null)
        .order("position", { ascending: true }),
    ]);
    setClips((c.data ?? []).map(mapClip));
    setQueue((q.data ?? []).map(mapQueueItem));
  }, [matchId]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`clips:${matchId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "replay_clips", filter: `match_id=eq.${matchId}` },
        () => void refetch(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "replay_queue", filter: `match_id=eq.${matchId}` },
        () => void refetch(),
      )
      .subscribe();
    return () => {
      channel.unsubscribe();
    };
  }, [matchId, refetch]);

  return { clips, queue };
}
