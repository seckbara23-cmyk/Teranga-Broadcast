import { getActiveGraphics, listInstances } from "@/features/graphics/queries";
import { signOverlay } from "@/lib/overlay-token";
import { GraphicsControlPanel } from "@/components/graphics/graphics-control-panel";
import { GraphicsPreview } from "@/components/graphics/graphics-preview";
import { CopyUrlButton } from "@/components/graphics/copy-url-button";

export const dynamic = "force-dynamic";

/**
 * Graphics control panel (Phase 4 foundation). Operator-facing controls +
 * preview + the OBS overlay URL. No OBS connection — the overlay is a Browser
 * Source the operator opens. Graphics consumes Production state via context and
 * owns only graphics_* tables.
 */
export default async function GraphicsPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  const [graphics, instances] = await Promise.all([
    getActiveGraphics(matchId),
    listInstances(matchId),
  ]);

  const overlayPath = `/overlays/scorebug/${matchId}?token=${signOverlay(matchId)}`;

  return (
    <div className="graphics">
      <div className="graphics__main">
        <GraphicsControlPanel
          matchId={matchId}
          initialGraphics={graphics}
          instances={instances}
        />
      </div>

      <aside className="graphics__side">
        <section className="panel">
          <div className="panel__header">
            <span className="panel__title">Source OBS</span>
          </div>
          <div className="panel__body" style={{ display: "grid", gap: "0.6rem" }}>
            <p className="dim" style={{ margin: 0, fontSize: "0.8rem" }}>
              Ajoutez une source navigateur dans OBS avec cette URL (1920×1080,
              fond transparent).
            </p>
            <code className="overlay-url">{overlayPath}</code>
            <CopyUrlButton path={overlayPath} />
          </div>
        </section>

        <section className="panel">
          <div className="panel__header">
            <span className="panel__title">Aperçu</span>
            <span className="dim" style={{ fontSize: "0.75rem" }}>
              Temps réel
            </span>
          </div>
          <div className="panel__body">
            <GraphicsPreview initialGraphics={graphics} />
          </div>
        </section>
      </aside>
    </div>
  );
}
