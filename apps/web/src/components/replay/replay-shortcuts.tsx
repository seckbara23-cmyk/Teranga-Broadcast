"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProduction } from "@/components/production/production-provider";
import { eventClockLabel } from "@/features/production/clock";
import { extractClip } from "@/features/replay/clip-actions";

function isTyping(t: EventTarget | null) {
  const el = t as HTMLElement | null;
  if (!el) return false;
  return ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) || el.isContentEditable;
}

/**
 * Match-wide replay shortcuts (active on every tab of a match):
 *   M  extract a default clip (program, 15s) stamped with the live match clock
 *   R  open the Replay workspace
 * Mounted inside ProductionProvider so the clock is consumed from context.
 */
export function ReplayShortcuts() {
  const router = useRouter();
  const { matchId, clock, displayMs } = useProduction();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      const k = e.key.toLowerCase();
      if (k === "m") {
        const label = eventClockLabel(displayMs, clock.periodRegulationMin);
        void extractClip({
          matchId,
          cameraId: "program",
          durationS: 15,
          matchClockMs: displayMs,
          clockLabel: label,
        });
      } else if (k === "r") {
        router.push(`/matches/${matchId}/replay`);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [matchId, clock.periodRegulationMin, displayMs, router]);

  return null;
}
