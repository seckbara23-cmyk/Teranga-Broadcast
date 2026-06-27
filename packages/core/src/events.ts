/**
 * Event contracts (agent → console, and match-domain events) — PLACEHOLDER.
 *
 * Events describe things that happened: a replay was marked, an asset is ready,
 * OBS status changed, a goal was logged. They anchor to the match recording
 * timeline (see TimelineMs in @teranga/types).
 *
 * Example shape (to be implemented):
 *
 *   export const AssetReadyEvent = z.object({
 *     kind: z.literal("asset.ready"),
 *     matchId: z.string().uuid(),
 *     assetId: z.string().uuid(),
 *   });
 */

export {};
