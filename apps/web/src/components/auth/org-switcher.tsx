"use client";

import { setCurrentOrg } from "@/features/auth/actions";
import type { Membership } from "@/features/auth/tenant";

/**
 * Organization switcher — PLACEHOLDER.
 *
 * Lists the user's memberships and switches the active org by submitting to the
 * `setCurrentOrg` server action (which sets the `teranga-org` cookie). A richer
 * popover/command-menu version comes with the console UI later.
 */
export function OrgSwitcher({
  memberships,
  currentOrgId,
}: {
  memberships: Membership[];
  currentOrgId: string | null;
}) {
  if (memberships.length === 0) {
    return (
      <span style={{ fontSize: "0.8rem", color: "#a1a1aa" }}>
        Aucune organisation
      </span>
    );
  }

  return (
    <form action={setCurrentOrg} style={{ margin: 0 }}>
      <select
        name="orgId"
        defaultValue={currentOrgId ?? undefined}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        aria-label="Organisation active"
        style={{
          background: "#0a0a0b",
          color: "#fafafa",
          border: "1px solid #2f2f37",
          borderRadius: "0.5rem",
          padding: "0.35rem 0.5rem",
          fontSize: "0.85rem",
        }}
      >
        {memberships.map((m) => (
          <option key={m.organizationId} value={m.organizationId}>
            {m.organization.name} · {m.role}
          </option>
        ))}
      </select>
      <noscript>
        <button type="submit">Changer</button>
      </noscript>
    </form>
  );
}
