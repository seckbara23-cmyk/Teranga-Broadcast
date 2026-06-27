import { notFound } from "next/navigation";
import { verifyOverlay } from "@/lib/overlay-token";
import { ScorebugOverlay } from "@/components/graphics/scorebug-overlay";

export const dynamic = "force-dynamic";

/**
 * Public OBS Browser Source overlay. Token-gated (HMAC of matchId). Outside the
 * (app) shell — transparent, no chrome. Data arrives via the overlay broadcast
 * channel; this route never reads Production/Graphics tables.
 */
export default async function ScorebugOverlayPage({
  params,
  searchParams,
}: {
  params: Promise<{ matchId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { matchId } = await params;
  const { token } = await searchParams;

  if (!verifyOverlay(matchId, token)) {
    notFound();
  }

  return <ScorebugOverlay matchId={matchId} />;
}
