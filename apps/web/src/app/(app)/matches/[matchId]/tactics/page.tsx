import {
  getSession,
  listSessions,
  listLayers,
  listAnnotations,
  listReadyClips,
  getEventCounts,
} from "@/features/tactics/queries";
import { TacticsWorkspace } from "@/components/tactics/tactics-workspace";
import { SessionStart } from "@/components/tactics/session-start";

export const dynamic = "force-dynamic";

/**
 * Teranga Tactics — professional football analysis workspace. Every analysis
 * begins from a replay clip (freeze frame). Tactics owns only tactical_* tables
 * and consumes Replay / Production / Match data.
 */
export default async function TacticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ matchId: string }>;
  searchParams: Promise<{ session?: string }>;
}) {
  const { matchId } = await params;
  const { session: sessionId } = await searchParams;

  if (sessionId) {
    const session = await getSession(sessionId);
    if (session) {
      const [layers, annotations, counts] = await Promise.all([
        listLayers(sessionId),
        listAnnotations(sessionId),
        getEventCounts(matchId),
      ]);
      return (
        <TacticsWorkspace
          session={session}
          matchId={matchId}
          initialLayers={layers}
          initialAnnotations={annotations}
          counts={counts}
        />
      );
    }
  }

  const [clips, sessions] = await Promise.all([
    listReadyClips(matchId),
    listSessions(matchId),
  ]);
  return <SessionStart matchId={matchId} clips={clips} sessions={sessions} />;
}
