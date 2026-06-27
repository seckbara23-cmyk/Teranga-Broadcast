"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  moveQueueItem,
  removeQueueItem,
  setQueueStatus,
  queueLastMark,
} from "@/features/replay/actions";
import {
  MARK_TYPE_ICON,
  MARK_TYPE_LABEL,
  QUEUE_STATUS_DOT,
  QUEUE_STATUS_LABEL,
  type ReplayQueueItem,
  type ReplayQueueStatus,
} from "@/features/replay/types";

const STATUSES: ReplayQueueStatus[] = ["queued", "ready", "replay_later", "played"];

function isTyping(t: EventTarget | null) {
  const el = t as HTMLElement | null;
  if (!el) return false;
  return ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) || el.isContentEditable;
}

function mapRows(data: any[]): ReplayQueueItem[] {
  return data.map((r) => ({
    id: r.id,
    markId: r.mark_id,
    position: r.position,
    status: r.status,
    type: r.replay_marks?.type ?? "custom",
    clockLabel: r.replay_marks?.clock_label ?? null,
    matchClockMs: r.replay_marks?.match_clock_ms ?? null,
    operatorLabel: r.replay_marks?.operator_label ?? null,
  }));
}

export function ReplayQueue({
  matchId,
  initial,
}: {
  matchId: string;
  initial: ReplayQueueItem[];
}) {
  const [items, setItems] = useState<ReplayQueueItem[]>(initial);
  const [selected, setSelected] = useState<string | null>(initial[0]?.id ?? null);
  const [pending, startTransition] = useTransition();

  const refetch = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("replay_queue")
      .select(
        "id, mark_id, position, status, replay_marks(type, clock_label, match_clock_ms, operator_label)",
      )
      .eq("match_id", matchId)
      .order("position", { ascending: true });
    setItems(mapRows(data ?? []));
  }, [matchId]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`replay-queue:${matchId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "replay_queue", filter: `match_id=eq.${matchId}` },
        () => {
          void refetch();
        },
      )
      .subscribe();
    return () => {
      channel.unsubscribe();
    };
  }, [matchId, refetch]);

  // Q = queue last mark · Delete = remove selected
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      if (e.key.toLowerCase() === "q") {
        startTransition(() => queueLastMark(matchId));
      } else if (e.key === "Delete" || e.key === "Backspace") {
        const id = selected ?? items[0]?.id;
        if (id) startTransition(() => removeQueueItem(id, matchId));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [matchId, selected, items]);

  if (items.length === 0) {
    return (
      <div className="empty">
        File vide. Mettez un repère en file (File +) ou appuyez sur Q.
      </div>
    );
  }

  return (
    <table className="rq">
      <thead>
        <tr>
          {["#", "Type", "Temps", "Opérateur", "Statut", "Actions"].map((h) => (
            <th key={h}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {items.map((it, i) => (
          <tr
            key={it.id}
            className={`rq__row ${selected === it.id ? "rq__row--sel" : ""}`}
            onClick={() => setSelected(it.id)}
          >
            <td className="mono dim">{i + 1}</td>
            <td>
              <span style={{ marginRight: "0.4rem" }}>{MARK_TYPE_ICON[it.type]}</span>
              {MARK_TYPE_LABEL[it.type]}
            </td>
            <td className="mono">{it.clockLabel ?? "—"}</td>
            <td className="dim">{it.operatorLabel ?? ""}</td>
            <td>
              <span className="status">
                <span className={`status__dot ${QUEUE_STATUS_DOT[it.status]}`} />
                <select
                  className="rq__status"
                  value={it.status}
                  disabled={pending}
                  onChange={(e) =>
                    startTransition(() =>
                      setQueueStatus(it.id, matchId, e.target.value as ReplayQueueStatus),
                    )
                  }
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {QUEUE_STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </span>
            </td>
            <td>
              <div className="rq__actions">
                <button
                  className="iconbtn"
                  title="Monter"
                  disabled={pending || i === 0}
                  onClick={() => startTransition(() => moveQueueItem(it.id, "up"))}
                >
                  ↑
                </button>
                <button
                  className="iconbtn"
                  title="Descendre"
                  disabled={pending || i === items.length - 1}
                  onClick={() => startTransition(() => moveQueueItem(it.id, "down"))}
                >
                  ↓
                </button>
                <button
                  className="iconbtn iconbtn--danger"
                  title="Retirer (Suppr)"
                  disabled={pending}
                  onClick={() => startTransition(() => removeQueueItem(it.id, matchId))}
                >
                  ✕
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
