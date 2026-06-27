import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Per-match overlay token (HMAC of the matchId). Gates the public OBS overlay
 * route so a leaked URL is bound to one match and can't be guessed. Server-only.
 */
const SECRET = process.env.OVERLAY_TOKEN_SECRET || "dev-overlay-secret";

export function signOverlay(matchId: string): string {
  return createHmac("sha256", SECRET).update(matchId).digest("base64url");
}

export function verifyOverlay(matchId: string, token: string | undefined): boolean {
  if (!token) return false;
  const expected = signOverlay(matchId);
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}
