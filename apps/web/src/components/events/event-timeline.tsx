"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { MatchEventRow, MatchEventType } from "@/features/events/queries";

const TYPE_META: Record<MatchEventType, { label: string; color: string }> = {
  kickoff: { label: "Coup d'envoi", color: "var(--info)" },
  goal: { label: "But", color: "var(--accent)" },
  card: { label: "Carton", color: "var(--warn)" },
  substitution: { label: "Changement", color: "var(--fg-muted)" },
  penalty: { label: "Penalty", color: "var(--live)" },
  var_review: { label: "VAR", color: "var(--info)" },
  injury: { label: "Blessure", color: "var(--warn)" },
  period_start: { label: "Début période", color: "var(--info)" },
  period_end: { label: "Fin période", color: "var(--info)" },
  note: { label: "Note", color: "var(--fg-muted)" },
  custom: { label: "Événement", color: "var(--fg-muted)" },
};

function timeLabel(e: MatchEventRow): string {
  if (e.payload?.clock_label) return e.payload.clock_label;
  if (e.match_clock_ms == null) return "—";
  const totalSec = Math.floor(e.match_clock_ms / 1000);
  return `${Math.floor(totalSec / 60)}:${String(totalSec % 60).padStart(2, "0")}`;
}

function eventLabel(e: MatchEventRow, base: string): string {
  if (e.type === "card") {
    if (e.payload?.color === "red") return "Carton rouge";
    if (e.payload?.color === "yellow") return "Carton jaune";
  }
  if (e.type === "goal") {
    if (e.payload?.kind === "own") return "But c.s.c.";
    if (e.payload?.kind === "penalty") return "But (pen.)";
    if (e.payload?.kind === "shootout") return "Tir au but";
  }
  return base;
}

function wall(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function EventTimeline({
  matchId,
  initialEvents,
}: {
  matchId: string;
  initialEvents: MatchEventRow[];
}) {
  const [events, setEvents] = useState<MatchEventRow[]>(initialEvents);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`match-events:${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "match_events",
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          const row = payload.new as MatchEventRow;
          setEvents((prev) =>
            prev.some((e) => e.id === row.id) ? prev : [row, ...prev],
          );
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [matchId]);

  if (events.length === 0) {
    return (
      <div className="empty">
        Aucun événement. Utilisez les actions rapides pour journaliser le match.
      </div>
    );
  }

  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {events.map((e) => {
        const meta = TYPE_META[e.type] ?? TYPE_META.custom;
        return (
          <li
            key={e.id}
            className="row"
            style={{
              gap: "0.8rem",
              padding: "0.6rem 0.2rem",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <span
              className="mono"
              style={{ width: "3.5rem", color: "var(--fg-dim)", textAlign: "right" }}
            >
              {timeLabel(e)}
            </span>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: meta.color,
                flex: "0 0 auto",
              }}
            />
            <span style={{ fontWeight: 600, minWidth: "7.5rem" }}>
              {eventLabel(e, meta.label)}
              {e.team ? (
                <span className="dim" style={{ fontWeight: 400 }}>
                  {" "}
                  · {e.team === "home" ? "Dom." : "Ext."}
                </span>
              ) : null}
            </span>
            <span className="muted" style={{ flex: 1 }}>
              {e.label ?? ""}
            </span>
            <span className="mono dim" style={{ fontSize: "0.75rem" }}>
              {wall(e.created_at)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
