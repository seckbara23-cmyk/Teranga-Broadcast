import { resolveTenant } from "@/features/auth/tenant";
import {
  listClips,
  listClipQueue,
  getBufferStatus,
  searchArchive,
} from "@/features/replay/clip-queries";
import { ReplayWorkspace } from "@/components/replay/replay-workspace";

export const dynamic = "force-dynamic";

/**
 * Instant Replay workspace (Phase 6). Five-layer pipeline: buffer → extraction →
 * queue → output → archive. Clips are metadata; the Agent produces native media.
 */
export default async function ReplayPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  const tenant = await resolveTenant();
  const orgId = tenant.currentOrg?.id ?? "";

  const [clips, queue, status, archive] = await Promise.all([
    listClips(matchId),
    listClipQueue(matchId),
    getBufferStatus(matchId, orgId),
    searchArchive(orgId, ""),
  ]);

  return (
    <ReplayWorkspace
      matchId={matchId}
      orgId={orgId}
      initialClips={clips}
      initialQueue={queue}
      initialStatus={status}
      initialArchive={archive}
    />
  );
}
