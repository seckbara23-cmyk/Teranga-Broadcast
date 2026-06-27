"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CURRENT_ORG_COOKIE } from "./tenant";

const ORG_COOKIE_OPTS = {
  path: "/",
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 365,
};

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${base || "org"}-${globalThis.crypto.randomUUID().slice(0, 6)}`;
}

/** Switch the active organization (used by the org switcher). */
export async function setCurrentOrg(formData: FormData) {
  const orgId = String(formData.get("orgId") ?? "");
  if (orgId) {
    const cookieStore = await cookies();
    cookieStore.set(CURRENT_ORG_COOKIE, orgId, ORG_COOKIE_OPTS);
  }
  redirect("/");
}

/**
 * Create an organization for a user who has none yet. Uses the
 * create_organization_with_owner RPC (atomic org + owner membership) added in
 * migration 20260627000000.
 */
export async function createOrganization(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    redirect("/");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_organization_with_owner", {
    org_name: name,
    org_slug: slugify(name),
    org_locale: "fr",
  });

  if (error) {
    throw new Error(`Failed to create organization: ${error.message}`);
  }

  const newOrgId = (data as { id?: string } | null)?.id;
  if (newOrgId) {
    const cookieStore = await cookies();
    cookieStore.set(CURRENT_ORG_COOKIE, newOrgId, ORG_COOKIE_OPTS);
  }
  redirect("/");
}

/** Sign out and return to the login page. */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
