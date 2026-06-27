"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { MatchClockState, Score } from "@/features/production/types";
import { applyGoal } from "@/features/production/score";
import { computeDisplayMs } from "@/features/production/clock";

export type Teams = {
  home: string | null;
  away: string | null;
  homeFlag: string | null;
  awayFlag: string | null;
};

type ProductionContextValue = {
  matchId: string;
  clock: MatchClockState;
  score: Score;
  nowMs: number;
  displayMs: number | null;
  teams: Teams;
  competition: string | null;
};

const Ctx = createContext<ProductionContextValue | null>(null);

export function useProduction(): ProductionContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useProduction must be used within ProductionProvider");
  return v;
}

function rowToClock(row: any): MatchClockState {
  return {
    status: row.status,
    running: row.running,
    periodBaseMin: row.period_base_min,
    periodRegulationMin: row.period_regulation_min,
    accumulatedMs: Number(row.accumulated_ms),
    periodStartedAt: row.period_started_at,
  };
}

export function ProductionProvider({
  matchId,
  initialClock,
  initialScore,
  teams,
  competition,
  children,
}: {
  matchId: string;
  initialClock: MatchClockState;
  initialScore: Score;
  teams: Teams;
  competition: string | null;
  children: ReactNode;
}) {
  const [clock, setClock] = useState<MatchClockState>(initialClock);
  const [score, setScore] = useState<Score>(initialScore);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  // Tick while the clock is running so the big readout advances every second.
  useEffect(() => {
    if (!clock.running) return;
    const id = setInterval(() => setNowMs(Date.now()), 250);
    return () => clearInterval(id);
  }, [clock.running]);

  // Live sync of clock + score from the spine (Realtime).
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`prod:${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "match_clock",
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          if (payload.new && "status" in payload.new) {
            setClock(rowToClock(payload.new));
            setNowMs(Date.now());
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "match_events",
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          const row = payload.new as {
            type: string;
            team: "home" | "away" | null;
            payload?: { kind?: any } | null;
          };
          if (row.type === "goal") {
            setScore((prev) => applyGoal(prev, row));
          }
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [matchId]);

  const displayMs = useMemo(
    () => computeDisplayMs(clock, nowMs),
    [clock, nowMs],
  );

  const value = useMemo<ProductionContextValue>(
    () => ({ matchId, clock, score, nowMs, displayMs, teams, competition }),
    [matchId, clock, score, nowMs, displayMs, teams, competition],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
