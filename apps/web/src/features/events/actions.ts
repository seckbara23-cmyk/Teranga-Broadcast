"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { MatchClockState } from "@/features/production/types";
import { computeDisplayMs, eventClockLabel } from "@/features/production/clock";

/**
 * Log a match event onto the broadcast spine (Production Engine), stamped with
 * the AUTHORITATIVE match clock so the timeline reads "45+2", "12:44", etc.
 * organization_id is derived from the clock/match so RLS applies.
 */
export async function logEvent(formData: FormData) {
  const matchId = String(formData.get("match_id") ?? "");
  const type = String(formData.get("type") ?? "note");
  const teamRaw = String(formData.get("team") ?? "");
  const team = teamRaw === "home" || teamRaw === "away" ? teamRaw : null;
  const label = String(formData.get("label") ?? "").trim() || null;
  const kind = String(formData.get("payload_kind") ?? "").trim();
  const color = String(formData.get("payload_color") ?? "").trim();

  if (!matchId) throw new Error("logEvent: match_id is required");

  const supabase = await createClient();

  const { data: clock } = await supabase
    .from("match_clock")
    .select(
      "organization_id, status, running, period_base_min, period_regulation_min, accumulated_ms, period_started_at",
    )
    .eq("match_id", matchId)
    .maybeSingle();

  let organizationId: string | null = clock?.organization_id ?? null;
  let matchClockMs: number | null = null;
  let clockLabel: string | null = null;

  if (clock) {
    const state: MatchClockState = {
      status: clock.status,
      running: clock.running,
      periodBaseMin: clock.period_base_min,
      periodRegulationMin: clock.period_regulation_min,
      accumulatedMs: Number(clock.accumulated_ms),
      periodStartedAt: clock.period_started_at,
    };
    matchClockMs = computeDisplayMs(state, Date.now());
    clockLabel = eventClockLabel(matchClockMs, state.periodRegulationMin);
  }

  if (!organizationId) {
    const { data: match } = await supabase
      .from("matches")
      .select("organization_id")
      .eq("id", matchId)
      .single();
    organizationId = (match as { organization_id: string } | null)?.organization_id ?? null;
  }
  if (!organizationId) throw new Error("logEvent: match not found");

  const payload: Record<string, unknown> = {};
  if (clockLabel) payload.clock_label = clockLabel;
  if (kind) payload.kind = kind;
  if (color) payload.color = color;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("match_events").insert({
    organization_id: organizationId,
    match_id: matchId,
    type,
    team,
    label,
    match_clock_ms: matchClockMs,
    payload,
    created_by: user?.id ?? null,
  });

  if (error) throw new Error(`Failed to log event: ${error.message}`);

  // Notify the Automation Engine (its API; we never touch its tables). Failures
  // here must not break event logging.
  try {
    const { fireMatchEventTriggers } = await import(
      "@/features/automation/trigger-bus"
    );
    await fireMatchEventTriggers(matchId, type);
  } catch {
    /* automation is best-effort on the event path */
  }

  revalidatePath(`/matches/${matchId}/timeline`);
  revalidatePath(`/matches/${matchId}`);
}
