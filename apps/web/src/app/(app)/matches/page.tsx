import { Suspense } from "react";
import Link from "next/link";
import { listMatches } from "@/features/matches/queries";
import { StatusBadge } from "@/components/matches/status-badge";
import { CreateMatchDialog } from "@/components/matches/create-match-dialog";

export const dynamic = "force-dynamic";

function formatKickoff(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function MatchCenterPage() {
  const matches = await listMatches();

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1 className="h1">Centre des matchs</h1>
          <p className="dim" style={{ margin: "0.25rem 0 0", fontSize: "0.82rem" }}>
            {matches.length} match{matches.length === 1 ? "" : "s"}
          </p>
        </div>
        <Link href="/matches?new=1" className="btn btn--primary">
          Nouveau match <span className="kbd">c</span>
        </Link>
      </div>

      {matches.length === 0 ? (
        <div className="empty">
          Aucun match. Créez votre premier match pour ouvrir le centre de
          production.
        </div>
      ) : (
        <div className="panel">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left" }}>
                {["Match", "Compétition", "Coup d'envoi", "Lieu", "Statut"].map(
                  (h) => (
                    <th
                      key={h}
                      style={{
                        padding: "0.6rem 0.9rem",
                        fontSize: "0.65rem",
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        color: "var(--fg-dim)",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {matches.map((m) => (
                <tr key={m.id} className="match-row">
                  <td style={{ padding: 0 }}>
                    <Link
                      href={`/matches/${m.id}`}
                      style={{
                        display: "block",
                        padding: "0.7rem 0.9rem",
                        fontWeight: 600,
                      }}
                    >
                      {m.title}
                    </Link>
                  </td>
                  <td className="muted" style={cellStyle}>
                    {m.competition ?? "—"}
                  </td>
                  <td className="muted mono" style={cellStyle}>
                    {formatKickoff(m.kickoff_at)}
                  </td>
                  <td className="muted" style={cellStyle}>
                    {m.venue?.name ?? "—"}
                  </td>
                  <td style={cellStyle}>
                    <StatusBadge status={m.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Suspense fallback={null}>
        <CreateMatchDialog />
      </Suspense>
    </div>
  );
}

const cellStyle = {
  padding: "0.7rem 0.9rem",
  borderTop: "1px solid var(--border)",
  fontSize: "0.85rem",
} as const;
