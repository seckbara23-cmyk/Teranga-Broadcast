/**
 * Generated Supabase database types — INTERIM PLACEHOLDER.
 *
 * As of Phase 0 / M0 the schema exists in:
 *   supabase/migrations/20260626000000_init_core_schema.sql
 * (organizations, organization_members, venues, broadcast_projects, matches,
 * audit_logs).
 *
 * This file will be REPLACED wholesale by the Supabase generator — never edit by
 * hand once generation is wired up:
 *
 *   supabase gen types typescript --local > packages/types/src/database.ts
 *
 * Until the generator is run in your environment, this hand-written stub keeps
 * `@teranga/types` compiling and documents the strategy. Keeping DB types behind
 * this package is what keeps the data layer portable across Supabase Cloud and
 * self-hosted/on-prem deployments.
 */

/** Replaced by the generated `Database` type. Shape mirrors the generator's. */
export type Database = {
  public: {
    Tables: Record<string, unknown>;
    Views: Record<string, never>;
    Functions: Record<string, unknown>;
    Enums: Record<string, never>;
  };
};

/** App-facing role union — mirrors the CHECK constraint on organization_members.role. */
export type OrgRole = "owner" | "admin" | "producer" | "operator" | "viewer";

/** Mirrors matches.status. */
export type MatchStatus =
  | "scheduled"
  | "live"
  | "halftime"
  | "finished"
  | "archived";
