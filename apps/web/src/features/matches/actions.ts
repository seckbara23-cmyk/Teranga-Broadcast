"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveTenant } from "@/features/auth/tenant";

/**
 * Create a match in the active organization and open its Production Console.
 * RLS requires an owner/admin/producer role on the org.
 */
export async function createMatch(formData: FormData) {
  const tenant = await resolveTenant();
  if (!tenant.currentOrg) redirect("/");

  const home = String(formData.get("home_team") ?? "").trim();
  const away = String(formData.get("away_team") ?? "").trim();
  const competition = String(formData.get("competition") ?? "").trim();
  const kickoffRaw = String(formData.get("kickoff_at") ?? "").trim();
  const titleInput = String(formData.get("title") ?? "").trim();

  const title =
    titleInput || (home && away ? `${home} vs ${away}` : "Nouveau match");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .insert({
      organization_id: tenant.currentOrg.id,
      title,
      competition: competition || null,
      home_team: home || null,
      away_team: away || null,
      kickoff_at: kickoffRaw ? new Date(kickoffRaw).toISOString() : null,
      status: "scheduled",
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to create match: ${error.message}`);
  }

  redirect(`/matches/${data.id}`);
}
