import { getMatch } from "@/features/matches/queries";
import { MatchClock } from "@/components/production/match-clock";
import { ClockControls } from "@/components/production/clock-controls";
import { QuickEventPanel } from "@/components/production/quick-event-panel";
import { TransportControls } from "@/components/production/transport-controls";
import { StatusGrid } from "@/components/production/status-grid";

export const dynamic = "force-dynamic";

/**
 * Production Control Console.
 *
 * Match Clock Engine (authoritative) + clock transport, Quick Event Panel,
 * operator transport (Replay/Agent placeholders), and the production status
 * board. Replay / Graphics / Tactics are NOT implemented — they will subscribe
 * to this Production Engine's clock, status, score, and event spine.
 */
export default async function ProductionConsolePage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  const match = await getMatch(matchId);

  return (
    <div className="console">
      <section className="panel console__clockbar">
        <MatchClock />
        <ClockControls />
      </section>

      <section className="panel">
        <div className="panel__header">
          <span className="panel__title">Événements rapides</span>
          <span className="dim" style={{ fontSize: "0.75rem" }}>
            Un clic = événement · B / N / V / X
          </span>
        </div>
        <div className="panel__body">
          <QuickEventPanel />
        </div>
      </section>

      <section className="panel">
        <div className="panel__header">
          <span className="panel__title">Transport opérateur</span>
          <span className="dim" style={{ fontSize: "0.75rem" }}>
            Replay & Agent OBS — à venir
          </span>
        </div>
        <div className="panel__body">
          <TransportControls />
        </div>
      </section>

      <section className="panel">
        <div className="panel__header">
          <span className="panel__title">État de production</span>
          <span className="dim" style={{ fontSize: "0.75rem" }}>
            En attente de l&apos;agent local
          </span>
        </div>
        <div className="panel__body">
          <StatusGrid fps={match?.fps} />
        </div>
      </section>
    </div>
  );
}
