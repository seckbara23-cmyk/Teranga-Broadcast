import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getMatch } from "@/features/matches/queries";
import { getOrCreateClock, getScore } from "@/features/production/queries";
import { teamFlag } from "@/lib/flags";
import { ProductionProvider } from "@/components/production/production-provider";
import { MatchHeader } from "@/components/production/match-header";
import { MatchTabs } from "@/components/production/match-tabs";
import { ReplayShortcuts } from "@/components/replay/replay-shortcuts";

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

  const [clock, score] = await Promise.all([
    getOrCreateClock(matchId),
    getScore(matchId),
  ]);

  const teams = {
    home: match.home_team,
    away: match.away_team,
    homeFlag: teamFlag(match.home_team),
    awayFlag: teamFlag(match.away_team),
  };

  return (
    <ProductionProvider
      matchId={matchId}
      initialClock={clock}
      initialScore={score}
      teams={teams}
      competition={match.competition}
    >
      <MatchHeader />
      <MatchTabs matchId={matchId} />
      <div className="page" style={{ paddingTop: "1.1rem" }}>
        {children}
      </div>
      <ReplayShortcuts />
    </ProductionProvider>
  );
}
