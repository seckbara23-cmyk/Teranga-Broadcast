"use client";

import { useState, useTransition } from "react";
import { updateSessionColors } from "@/features/tactics/actions";

export function TeamColors({
  sessionId,
  matchId,
  home,
  away,
}: {
  sessionId: string;
  matchId: string;
  home: string;
  away: string;
}) {
  const [h, setH] = useState(home);
  const [a, setA] = useState(away);
  const [pending, startTransition] = useTransition();

  function save(nh: string, na: string) {
    startTransition(() => updateSessionColors(sessionId, matchId, nh, na));
  }

  return (
    <div className="row" style={{ gap: "0.8rem" }}>
      <label className="row" style={{ gap: "0.4rem" }}>
        <span className="tile__label">Dom.</span>
        <input type="color" value={h} disabled={pending}
          onChange={(e) => { setH(e.target.value); save(e.target.value, a); }} />
      </label>
      <label className="row" style={{ gap: "0.4rem" }}>
        <span className="tile__label">Ext.</span>
        <input type="color" value={a} disabled={pending}
          onChange={(e) => { setA(e.target.value); save(h, e.target.value); }} />
      </label>
    </div>
  );
}
