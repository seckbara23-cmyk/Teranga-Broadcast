"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  createPlaylist,
  addLastMarkToPlaylist,
} from "@/features/replay/actions";
import type { ReplayPlaylist } from "@/features/replay/types";

export function PlaylistPanel({
  matchId,
  initial,
}: {
  matchId: string;
  initial: ReplayPlaylist[];
}) {
  const [playlists, setPlaylists] = useState<ReplayPlaylist[]>(initial);
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();

  const refetch = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("replay_playlists")
      .select("id, name, created_at, playlist_items(count)")
      .eq("match_id", matchId)
      .order("created_at", { ascending: false });
    setPlaylists(
      (data ?? []).map((r: any) => ({
        id: r.id,
        name: r.name,
        itemCount: r.playlist_items?.[0]?.count ?? 0,
        createdAt: r.created_at,
      })),
    );
  }, [matchId]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`replay-playlists:${matchId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "replay_playlists", filter: `match_id=eq.${matchId}` },
        () => void refetch(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "playlist_items", filter: `match_id=eq.${matchId}` },
        () => void refetch(),
      )
      .subscribe();
    return () => {
      channel.unsubscribe();
    };
  }, [matchId, refetch]);

  return (
    <div style={{ display: "grid", gap: "0.8rem" }}>
      <div className="row" style={{ gap: "0.5rem" }}>
        <input
          className="input"
          placeholder="Nom de la playlist"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          className="btn"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await createPlaylist(matchId, name);
              setName("");
            })
          }
        >
          Créer
        </button>
      </div>

      {playlists.length === 0 ? (
        <div className="empty">Aucune playlist.</div>
      ) : (
        <ul className="pl-list">
          {playlists.map((p) => (
            <li key={p.id} className="pl-row">
              <span className="pl-row__name">{p.name}</span>
              <span className="dim mono">{p.itemCount} clip(s)</span>
              <button
                className="btn btn--ghost"
                disabled={pending}
                onClick={() =>
                  startTransition(() => addLastMarkToPlaylist(p.id, matchId))
                }
                title="Ajouter le dernier repère"
              >
                + dernier repère
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
