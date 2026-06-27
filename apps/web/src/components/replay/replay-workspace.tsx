"use client";

import { useState } from "react";
import { useClips } from "./use-clips";
import { ReplayStatus } from "./replay-status";
import { MarkPanel } from "./mark-panel";
import { ClipPreview } from "./clip-preview";
import { ClipQueue } from "./clip-queue";
import { ClipList } from "./clip-list";
import { ReplayArchive } from "./replay-archive";
import { ReplayBufferWidget } from "./replay-buffer-widget";
import { ReplayTransport } from "./replay-transport";
import type {
  ArchiveEntry,
  BufferStatus,
  ClipQueueItem,
  ReplayClip,
} from "@/features/replay/clip-types";

/** Phase 6 Instant Replay workspace — orchestrates the five-layer pipeline. */
export function ReplayWorkspace({
  matchId,
  orgId,
  initialClips,
  initialQueue,
  initialStatus,
  initialArchive,
}: {
  matchId: string;
  orgId: string;
  initialClips: ReplayClip[];
  initialQueue: ClipQueueItem[];
  initialStatus: BufferStatus;
  initialArchive: ArchiveEntry[];
}) {
  const { clips, queue } = useClips(matchId, initialClips, initialQueue);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialClips[0]?.id ?? null,
  );
  const selected = clips.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="replay">
      <div className="replay__main">
        <section className="panel">
          <div className="panel__header">
            <span className="panel__title">État replay</span>
          </div>
          <div className="panel__body">
            <ReplayStatus status={initialStatus} clipCount={clips.length} queueCount={queue.length} />
          </div>
        </section>

        <section className="panel">
          <div className="panel__header">
            <span className="panel__title">Extraction</span>
            <span className="dim" style={{ fontSize: "0.75rem" }}>MARK · M</span>
          </div>
          <div className="panel__body">
            <MarkPanel />
          </div>
        </section>

        <section className="panel">
          <div className="panel__header">
            <span className="panel__title">Aperçu</span>
            <span className="dim" style={{ fontSize: "0.75rem" }}>
              Ralenti 100 / 75 / 50 / 25 %
            </span>
          </div>
          <div className="panel__body">
            <ClipPreview clip={selected} />
          </div>
        </section>

        <section className="panel">
          <div className="panel__header">
            <span className="panel__title">File de replay</span>
            <span className="dim" style={{ fontSize: "0.75rem" }}>Temps réel</span>
          </div>
          <div className="panel__body">
            <ClipQueue matchId={matchId} queue={queue} />
          </div>
        </section>

        <section className="panel">
          <div className="panel__header">
            <span className="panel__title">Transport</span>
            <span className="dim" style={{ fontSize: "0.75rem" }}>Sortie OBS — à l&apos;approbation</span>
          </div>
          <div className="panel__body">
            <ReplayTransport />
          </div>
        </section>
      </div>

      <aside className="replay__side">
        <section className="panel">
          <div className="panel__header">
            <span className="panel__title">Clips</span>
          </div>
          <div className="panel__body">
            <ClipList matchId={matchId} clips={clips} selectedId={selectedId} onSelect={setSelectedId} />
          </div>
        </section>

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
            <span className="panel__title">Archive</span>
          </div>
          <div className="panel__body">
            <ReplayArchive orgId={orgId} initial={initialArchive} />
          </div>
        </section>
      </aside>
    </div>
  );
}
