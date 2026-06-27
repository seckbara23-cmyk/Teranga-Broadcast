"use client";

import { useEffect, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { queueMark } from "@/features/replay/actions";
import {
  MARK_TYPE_ICON,
  MARK_TYPE_LABEL,
  type ReplayMark,
} from "@/features/replay/types";

function mapRow(r: any): ReplayMark {
  return {
    id: r.id,
    type: r.type,
    matchClockMs: r.match_clock_ms,
    clockLabel: r.clock_label,
    source: r.source,
    note: r.note,
    operatorLabel: r.operator_label,
    createdAt: r.created_at,
  };
}

export function RecentMarks({
  matchId,
  initial,
}: {
  matchId: string;
  initial: ReplayMark[];
}) {
  const [marks, setMarks] = useState<ReplayMark[]>(initial);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`replay-marks:${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "replay_marks",
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          const m = mapRow(payload.new);
          setMarks((prev) => (prev.some((x) => x.id === m.id) ? prev : [m, ...prev]));
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "replay_marks",
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          setMarks((prev) => prev.filter((x) => x.id !== (payload.old as any).id));
        },
      )
      .subscribe();
    return () => {
      channel.unsubscribe();
    };
  }, [matchId]);

  if (marks.length === 0) {
    return <div className="empty">Aucun repère. Appuyez sur MARK (M).</div>;
  }

  return (
    <ul className="mark-list">
      {marks.map((m) => (
        <li key={m.id} className="mark-row">
          <span className="mono mark-row__time">{m.clockLabel ?? "—"}</span>
          <span className="mark-row__type">
            <span>{MARK_TYPE_ICON[m.type]}</span>
            {MARK_TYPE_LABEL[m.type]}
          </span>
          <span className="dim mark-row__op">{m.operatorLabel ?? ""}</span>
          <button
            className="btn btn--ghost"
            disabled={pending}
            onClick={() => startTransition(() => queueMark(matchId, m.id))}
          >
            File +
          </button>
        </li>
      ))}
    </ul>
  );
}
