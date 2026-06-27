"use client";

import { useState, useTransition } from "react";
import { insertFormation } from "@/features/tactics/actions";
import { FORMATIONS, type FormationName } from "@/features/tactics/types";

const NAMES = Object.keys(FORMATIONS) as FormationName[];

export function FormationPicker({
  sessionId,
  matchId,
  activeLayerId,
}: {
  sessionId: string;
  matchId: string;
  activeLayerId: string | null;
}) {
  const [team, setTeam] = useState<"home" | "away">("home");
  const [pending, startTransition] = useTransition();

  return (
    <div style={{ display: "grid", gap: "0.5rem" }}>
      <div className="row" style={{ gap: "0.4rem" }}>
        <button className={`chip ${team === "home" ? "chip--on" : ""}`} onClick={() => setTeam("home")}>Domicile</button>
        <button className={`chip ${team === "away" ? "chip--on" : ""}`} onClick={() => setTeam("away")}>Extérieur</button>
      </div>
      <div className="tac-formations">
        {NAMES.map((f) => (
          <button
            key={f}
            className="chip"
            disabled={pending || !activeLayerId}
            title={activeLayerId ? "Insérer la formation" : "Sélectionnez un calque"}
            onClick={() =>
              activeLayerId &&
              startTransition(() => insertFormation(sessionId, activeLayerId, matchId, f, team))
            }
          >
            {f}
          </button>
        ))}
      </div>
    </div>
  );
}
