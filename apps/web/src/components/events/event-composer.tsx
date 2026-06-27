import { logEvent } from "@/features/events/actions";

/**
 * Quick-log surface for the operator. Plain forms bound to the logEvent server
 * action — works fast, keyboard-accessible, and resilient (no JS required).
 */
export function EventComposer({ matchId }: { matchId: string }) {
  return (
    <div style={{ display: "grid", gap: "0.7rem" }}>
      <div className="row" style={{ flexWrap: "wrap" }}>
        <QuickButton matchId={matchId} type="goal" team="home" label="But domicile" primary />
        <QuickButton matchId={matchId} type="goal" team="away" label="But extérieur" primary />
        <QuickButton matchId={matchId} type="card" label="Carton" />
        <QuickButton matchId={matchId} type="substitution" label="Changement" />
        <QuickButton matchId={matchId} type="penalty" label="Penalty" />
        <QuickButton matchId={matchId} type="period_start" label="Début période" />
        <QuickButton matchId={matchId} type="period_end" label="Fin période" />
      </div>

      <form action={logEvent} className="row" style={{ gap: "0.5rem" }}>
        <input type="hidden" name="match_id" value={matchId} />
        <input type="hidden" name="type" value="note" />
        <input
          name="match_clock_min"
          className="input"
          placeholder="min"
          inputMode="numeric"
          style={{ width: "4.5rem", flex: "0 0 auto" }}
        />
        <input name="label" className="input" placeholder="Ajouter une note…" />
        <button type="submit" className="btn">
          Ajouter
        </button>
      </form>
    </div>
  );
}

function QuickButton({
  matchId,
  type,
  team,
  label,
  primary,
}: {
  matchId: string;
  type: string;
  team?: "home" | "away";
  label: string;
  primary?: boolean;
}) {
  return (
    <form action={logEvent} style={{ margin: 0 }}>
      <input type="hidden" name="match_id" value={matchId} />
      <input type="hidden" name="type" value={type} />
      {team ? <input type="hidden" name="team" value={team} /> : null}
      <button type="submit" className={`btn ${primary ? "btn--primary" : ""}`}>
        {label}
      </button>
    </form>
  );
}
