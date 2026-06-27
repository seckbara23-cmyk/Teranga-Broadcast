import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Cookie holding the user's currently-selected organization id. */
export const CURRENT_ORG_COOKIE = "teranga-org";

export type Organization = {
  id: string;
  name: string;
  slug: string;
  locale: string;
};

export type Membership = {
  organizationId: string;
  role: string;
  organization: Organization;
};

export type Tenant = {
  user: { id: string; email: string | null };
  memberships: Membership[];
  currentOrg: Organization | null;
  currentRole: string | null;
};

/**
 * Tenant resolver.
 *
 * Loads the authenticated user, all of their organization memberships (via RLS
 * on organization_members + organizations), and resolves the "current" org from
 * the `teranga-org` cookie, falling back to the first membership.
 *
 * Wrapped in React `cache()` so multiple callers within one request (layout +
 * page) share a single round-trip. Redirects to /login if there is no session.
 */
export const resolveTenant = cache(async (): Promise<Tenant> => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("organization_members")
    .select("organization_id, role, organizations(id, name, slug, locale)")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load organization memberships: ${error.message}`);
  }

  const memberships: Membership[] = (data ?? []).map((row: any) => ({
    organizationId: row.organization_id as string,
    role: row.role as string,
    organization: row.organizations as Organization,
  }));

  const cookieStore = await cookies();
  const selectedId = cookieStore.get(CURRENT_ORG_COOKIE)?.value;
  const selected =
    memberships.find((m) => m.organizationId === selectedId) ??
    memberships[0] ??
    null;

  return {
    user: { id: user.id, email: user.email ?? null },
    memberships,
    currentOrg: selected?.organization ?? null,
    currentRole: selected?.role ?? null,
  };
});
