"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Log a match event onto the broadcast spine (Production Engine).
 * organization_id is derived from the match so RLS (producer/operator) applies.
 */
export async function logEvent(formData: FormData) {
  const matchId = String(formData.get("match_id") ?? "");
  const type = String(formData.get("type") ?? "note");
  const teamRaw = String(formData.get("team") ?? "");
  const team = teamRaw === "home" || teamRaw === "away" ? teamRaw : null;
  const label = String(formData.get("label") ?? "").trim() || null;
  const clockRaw = String(formData.get("match_clock_min") ?? "").trim();

  if (!matchId) throw new Error("logEvent: match_id is required");

  const supabase = await createClient();

  const { data: match, error: matchErr } = await supabase
    .from("matches")
    .select("organization_id")
    .eq("id", matchId)
    .single();
  if (matchErr || !match) {
    throw new Error("logEvent: match not found");
  }

  const matchClockMs =
    clockRaw && !Number.isNaN(Number(clockRaw))
      ? Math.round(Number(clockRaw) * 60_000)
      : null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("match_events").insert({
    organization_id: (match as { organization_id: string }).organization_id,
    match_id: matchId,
    type,
    team,
    label,
    match_clock_ms: matchClockMs,
    created_by: user?.id ?? null,
  });

  if (error) throw new Error(`Failed to log event: ${error.message}`);

  revalidatePath(`/matches/${matchId}/timeline`);
  revalidatePath(`/matches/${matchId}`);
}
