import {
  listMarks,
  listQueue,
  listPlaylists,
} from "@/features/replay/queries";
import { MarkButton } from "@/components/replay/mark-button";
import { RecentMarks } from "@/components/replay/recent-marks";
import { ReplayQueue } from "@/components/replay/replay-queue";
import { ReplayBufferWidget } from "@/components/replay/replay-buffer-widget";
import { ReplayTransport } from "@/components/replay/replay-transport";
import { PlaylistPanel } from "@/components/replay/playlist-panel";

export const dynamic = "force-dynamic";

/**
 * Replay workspace (Phase 3 — foundation, metadata only).
 *
 * Marks, queue, and playlists are real and realtime. Buffer + transport are
 * design placeholders until the Replay Agent connects. No video exists yet.
 */
export default async function ReplayPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  const [marks, queue, playlists] = await Promise.all([
    listMarks(matchId),
    listQueue(matchId),
    listPlaylists(matchId),
  ]);

  return (
    <div className="replay">
      <div className="replay__main">
        <section className="panel">
          <div className="panel__header">
            <span className="panel__title">Repères replay</span>
            <span className="dim" style={{ fontSize: "0.75rem" }}>
              Un clic = repère · M
            </span>
          </div>
          <div className="panel__body">
            <MarkButton />
          </div>
        </section>

        <section className="panel">
          <div className="panel__header">
            <span className="panel__title">File de replay</span>
            <span className="dim" style={{ fontSize: "0.75rem" }}>
              Q file · Suppr retire · temps réel
            </span>
          </div>
          <div className="panel__body">
            <ReplayQueue matchId={matchId} initial={queue} />
          </div>
        </section>

        <section className="panel">
          <div className="panel__header">
            <span className="panel__title">Transport replay</span>
            <span className="dim" style={{ fontSize: "0.75rem" }}>
              Agent replay requis — à venir
            </span>
          </div>
          <div className="panel__body">
            <ReplayTransport />
          </div>
        </section>
      </div>

      <aside className="replay__side">
        <section className="panel">
          <div className="panel__header">
            <span className="panel__title">Tampon replay</span>
          </div>
          <div className="panel__body">
            <ReplayBufferWidget />
          </div>
        </section>

        <section className="panel">
          <div className="panel__header">
            <span className="panel__title">Repères récents</span>
          </div>
          <div className="panel__body">
            <RecentMarks matchId={matchId} initial={marks} />
          </div>
        </section>

        <section className="panel">
          <div className="panel__header">
            <span className="panel__title">Playlists</span>
          </div>
          <div className="panel__body">
            <PlaylistPanel matchId={matchId} initial={playlists} />
          </div>
        </section>
      </aside>
    </div>
  );
}
