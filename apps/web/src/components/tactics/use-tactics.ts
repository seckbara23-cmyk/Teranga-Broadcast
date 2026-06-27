"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { mapAnnotation, mapLayer } from "@/features/tactics/map";
import type { TacticalAnnotation, TacticalLayer } from "@/features/tactics/types";

/** Live layers + annotations for a session (collaborative Realtime). */
export function useTactics(
  sessionId: string,
  initialLayers: TacticalLayer[],
  initialAnnotations: TacticalAnnotation[],
) {
  const [layers, setLayers] = useState<TacticalLayer[]>(initialLayers);
  const [annotations, setAnnotations] =
    useState<TacticalAnnotation[]>(initialAnnotations);

  const refetch = useCallback(async () => {
    const supabase = createClient();
    const [l, a] = await Promise.all([
      supabase.from("tactical_layers").select("*").eq("session_id", sessionId).order("z_order", { ascending: true }),
      supabase.from("tactical_annotations").select("*").eq("session_id", sessionId).order("z_order", { ascending: true }),
    ]);
    setLayers((l.data ?? []).map(mapLayer));
    setAnnotations((a.data ?? []).map(mapAnnotation));
  }, [sessionId]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`tactics:${sessionId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tactical_layers", filter: `session_id=eq.${sessionId}` }, () => void refetch())
      .on("postgres_changes", { event: "*", schema: "public", table: "tactical_annotations", filter: `session_id=eq.${sessionId}` }, () => void refetch())
      .subscribe();
    return () => {
      channel.unsubscribe();
    };
  }, [sessionId, refetch]);

  return { layers, annotations };
}
