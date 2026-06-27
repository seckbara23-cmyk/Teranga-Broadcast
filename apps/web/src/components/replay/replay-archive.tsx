"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cameraLabel, type ArchiveEntry } from "@/features/replay/clip-types";

export function ReplayArchive({
  orgId,
  initial,
}: {
  orgId: string;
  initial: ArchiveEntry[];
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ArchiveEntry[]>(initial);

  useEffect(() => {
    const supabase = createClient();
    const run = async () => {
      let q = supabase
        .from("replay_archive")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (query.trim()) {
        const term = `%${query.trim()}%`;
        q = q.or(`title.ilike.${term},search_text.ilike.${term}`);
      }
      const { data } = await q;
      setResults(
        (data ?? []).map((r: any) => ({
          id: r.id,
          title: r.title,
          cameraId: r.camera_id,
          operatorLabel: r.operator_label,
          durationS: r.duration_s,
          clipPath: r.clip_path,
          thumbnailPath: r.thumbnail_path,
          createdAt: r.created_at,
        })),
      );
    };
    const t = setTimeout(run, 250); // debounce
    return () => clearTimeout(t);
  }, [orgId, query]);

  return (
    <div style={{ display: "grid", gap: "0.6rem" }}>
      <input
        className="input"
        placeholder="Rechercher dans l'archive…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {results.length === 0 ? (
        <div className="empty">Aucun élément.</div>
      ) : (
        <ul className="clip-list">
          {results.map((a) => (
            <li key={a.id} className="clip-row">
              <span className="status__dot status__dot--idle" />
              <span className="clip-row__name">
                {a.title}
                <span className="dim" style={{ fontWeight: 400 }}>
                  {" "}· {cameraLabel(a.cameraId)} · {a.durationS ?? "—"}s
                </span>
              </span>
              <span className="dim mono" style={{ fontSize: "0.72rem" }}>
                {a.operatorLabel ?? ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
