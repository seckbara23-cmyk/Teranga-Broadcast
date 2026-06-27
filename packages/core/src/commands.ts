/**
 * Command contracts (console → agent) — PLACEHOLDER.
 *
 * Commands are imperative requests the operator console sends to the Teranga
 * Agent (e.g. play a replay, switch scene, update the scoreboard). Each will be
 * a zod schema so both sides validate the same shape.
 *
 * Example shape (to be implemented):
 *
 *   export const ReplayPlayCommand = z.object({
 *     kind: z.literal("replay.play"),
 *     matchId: z.string().uuid(),
 *     markId: z.string().uuid(),
 *     speed: z.union([z.literal(1), z.literal(0.5), z.literal(0.25)]),
 *   });
 */

export {};
