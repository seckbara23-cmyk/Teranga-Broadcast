/**
 * @teranga/types — pure shared types.
 *
 * PLACEHOLDER. Zero runtime dependencies by design: this package is the
 * portability seam for the data layer (Supabase Cloud → self-hosted/on-prem).
 *
 * Real domain types (Match, Team, MatchEvent, ReplayMark, Asset, ...) and the
 * generated Supabase database types will live here. See docs/08-database-model.md.
 */

export type Uuid = string;

/** Milliseconds on the match recording timeline (single time base). */
export type TimelineMs = number;

/** Placeholder marker so the module is non-empty; remove once real types land. */
export const TERANGA_TYPES_PLACEHOLDER = true as const;

// Re-exported here once generated: export type { Database } from "./database.js";
