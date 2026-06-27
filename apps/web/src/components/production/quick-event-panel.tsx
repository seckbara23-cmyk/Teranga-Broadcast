"use client";

import { useEffect, useTransition } from "react";
import { useProduction } from "./production-provider";
import { logEvent } from "@/features/events/actions";

type Team = "home" | "away";

function isTyping(t: EventTarget | null) {
  const el = t as HTMLElement | null;
  if (!el) return false;
  return ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) || el.isContentEditable;
}

export function QuickEventPanel() {
  const { matchId, clock, teams } = useProduction();
  const [pending, startTransition] = useTransition();

  function fire(opts: {
    type: string;
    team?: Team;
    kind?: string;
    color?: string;
  }) {
    const fd = new FormData();
    fd.set("match_id", matchId);
    fd.set("type", opts.type);
    if (opts.team) fd.set("team", opts.team);
    if (opts.kind) fd.set("payload_kind", opts.kind);
    if (opts.color) fd.set("payload_color", opts.color);
    startTransition(() => logEvent(fd));
  }

  // Keyboard shortcuts for the most-used events.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTyping(e.target)) return;
      switch (e.key.toLowerCase()) {
        case "b":
          fire({ type: "goal", team: "home" });
          break;
        case "n":
          fire({ type: "goal", team: "away" });
          break;
        case "v":
          fire({ type: "var_review" });
          break;
        case "x":
          fire({ type: "injury" });
          break;
        default:
          return;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  const inPenalties = clock.status === "penalties";

  return (
    <div className={`quick-panel ${pending ? "quick-panel--pending" : ""}`}>
      <div className="quick-cols">
        <TeamColumn
          name={teams.home ?? "Domicile"}
          team="home"
          goalKey="B"
          onFire={fire}
        />
        <TeamColumn
          name={teams.away ?? "Extérieur"}
          team="away"
          goalKey="N"
          onFire={fire}
        />
      </div>

      <div className="quick-neutral">
        <Qbtn icon="🖥" label="VAR" hint="V" onClick={() => fire({ type: "var_review" })} />
        <Qbtn icon="🩹" label="Blessure" hint="X" onClick={() => fire({ type: "injury" })} />
        <Qbtn icon="🔁" label="csc Dom." small onClick={() => fire({ type: "goal", team: "home", kind: "own" })} />
        <Qbtn icon="🔁" label="csc Ext." small onClick={() => fire({ type: "goal", team: "away", kind: "own" })} />
        <Qbtn icon="🅿" label="Pen. Dom." small onClick={() => fire({ type: "goal", team: "home", kind: "penalty" })} />
        <Qbtn icon="🅿" label="Pen. Ext." small onClick={() => fire({ type: "goal", team: "away", kind: "penalty" })} />
        {inPenalties ? (
          <>
            <Qbtn icon="🥅" label="TAB Dom." onClick={() => fire({ type: "goal", team: "home", kind: "shootout" })} />
            <Qbtn icon="🥅" label="TAB Ext." onClick={() => fire({ type: "goal", team: "away", kind: "shootout" })} />
          </>
        ) : null}
      </div>
    </div>
  );
}

function TeamColumn({
  name,
  team,
  goalKey,
  onFire,
}: {
  name: string;
  team: Team;
  goalKey: string;
  onFire: (o: { type: string; team?: Team; kind?: string; color?: string }) => void;
}) {
  return (
    <div className="quick-col">
      <div className="quick-col__name">{name}</div>
      <Qbtn big icon="⚽" label="But" hint={goalKey} onClick={() => onFire({ type: "goal", team })} />
      <div className="quick-col__row">
        <Qbtn icon="🟨" label="Jaune" onClick={() => onFire({ type: "card", team, color: "yellow" })} />
        <Qbtn icon="🟥" label="Rouge" onClick={() => onFire({ type: "card", team, color: "red" })} />
      </div>
      <Qbtn icon="🔄" label="Changement" onClick={() => onFire({ type: "substitution", team })} />
    </div>
  );
}

function Qbtn({
  icon,
  label,
  hint,
  big,
  small,
  onClick,
}: {
  icon: string;
  label: string;
  hint?: string;
  big?: boolean;
  small?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`qbtn ${big ? "qbtn--big" : ""} ${small ? "qbtn--small" : ""}`}
      onClick={onClick}
    >
      <span className="qbtn__icon">{icon}</span>
      <span className="qbtn__label">{label}</span>
      {hint ? <span className="kbd qbtn__hint">{hint}</span> : null}
    </button>
  );
}
