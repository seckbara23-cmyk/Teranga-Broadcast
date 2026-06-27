import { listEvents } from "@/features/events/queries";
import { EventComposer } from "@/components/events/event-composer";
import { EventTimeline } from "@/components/events/event-timeline";

export const dynamic = "force-dynamic";

/**
 * Event Timeline — the live match event log (Production Engine spine).
 * Quick-log composer + a realtime-updating timeline.
 */
export default async function TimelinePage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  const events = await listEvents(matchId);

  return (
    <div style={{ display: "grid", gap: "1.1rem" }}>
      <div className="panel">
        <div className="panel__header">
          <span className="panel__title">Journal — actions rapides</span>
        </div>
        <div className="panel__body">
          <EventComposer matchId={matchId} />
        </div>
      </div>

      <div className="panel">
        <div className="panel__header">
          <span className="panel__title">Chronologie</span>
          <span className="dim" style={{ fontSize: "0.75rem" }}>
            Temps réel
          </span>
        </div>
        <div className="panel__body">
          <EventTimeline matchId={matchId} initialEvents={events} />
        </div>
      </div>
    </div>
  );
}
