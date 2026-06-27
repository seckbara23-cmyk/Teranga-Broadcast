import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getMatch } from "@/features/matches/queries";
import { StatusBadge } from "@/components/matches/status-badge";
import { MatchTabs } from "@/components/production/match-tabs";

export const dynamic = "force-dynamic";

export default async function MatchLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  const match = await getMatch(matchId);
  if (!match) notFound();

  const meta = [match.competition, match.venue?.name]
    .filter(Boolean)
    .join(" · ");

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          padding: "1rem 1.5rem 0.85rem",
        }}
      >
        <div>
          <h1 className="h1">{match.title}</h1>
          <p
            className="dim"
            style={{ margin: "0.2rem 0 0", fontSize: "0.8rem" }}
          >
            {meta || "—"}
          </p>
        </div>
        <StatusBadge status={match.status} />
      </div>

      <MatchTabs matchId={match.id} />

      <div className="page" style={{ paddingTop: "1.1rem" }}>
        {children}
      </div>
    </div>
  );
}
