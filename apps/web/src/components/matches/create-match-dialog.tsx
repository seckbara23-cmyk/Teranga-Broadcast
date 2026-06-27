"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { createMatch } from "@/features/matches/actions";

/** Opens when the URL has ?new=1 (linked from the header button and the `c`
 *  shortcut / command palette). Submits to the createMatch server action. */
export function CreateMatchDialog() {
  const params = useSearchParams();
  const router = useRouter();
  const open = params.get("new") === "1";

  if (!open) return null;

  const close = () => router.push("/matches");

  return (
    <div className="overlay" onClick={close}>
      <div
        className="panel"
        style={{ width: "min(34rem, 94vw)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel__header">
          <span className="panel__title">Nouveau match</span>
          <span className="dim" style={{ fontSize: "0.75rem" }}>
            Échap pour annuler
          </span>
        </div>
        <form action={createMatch}>
          <div
            className="panel__body"
            style={{ display: "grid", gap: "0.8rem" }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.8rem",
              }}
            >
              <div className="field">
                <label className="field__label">Équipe domicile</label>
                <input name="home_team" className="input" autoFocus />
              </div>
              <div className="field">
                <label className="field__label">Équipe extérieur</label>
                <input name="away_team" className="input" />
              </div>
            </div>
            <div className="field">
              <label className="field__label">Compétition</label>
              <input
                name="competition"
                className="input"
                placeholder="Ligue 1 Senegal"
              />
            </div>
            <div className="field">
              <label className="field__label">Coup d&apos;envoi</label>
              <input name="kickoff_at" type="datetime-local" className="input" />
            </div>
          </div>
          <div
            className="panel__header"
            style={{ borderTop: "1px solid var(--border)", borderBottom: "none" }}
          >
            <button
              type="button"
              className="btn btn--ghost"
              onClick={close}
            >
              Annuler
            </button>
            <button type="submit" className="btn btn--primary">
              Créer & ouvrir
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
