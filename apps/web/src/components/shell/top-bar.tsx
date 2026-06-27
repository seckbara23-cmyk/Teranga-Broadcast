"use client";

import { signOut } from "@/features/auth/actions";
import { OrgSwitcher } from "@/components/auth/org-switcher";
import type { Membership } from "@/features/auth/tenant";
import { ConnectionStatus, AgentStatus } from "./connection-status";
import { Clock } from "./clock";

function openPalette() {
  window.dispatchEvent(new CustomEvent("teranga:open-palette"));
}

export function TopBar({
  email,
  memberships,
  currentOrgId,
}: {
  email: string | null;
  memberships: Membership[];
  currentOrgId: string | null;
}) {
  return (
    <header className="topbar">
      <div className="topbar__group">
        <button
          className="btn btn--ghost"
          onClick={openPalette}
          title="Palette de commandes"
        >
          Rechercher / aller à… <span className="kbd">⌘K</span>
        </button>
      </div>

      <div className="topbar__group">
        <AgentStatus />
        <ConnectionStatus />
        <Clock />
        <OrgSwitcher memberships={memberships} currentOrgId={currentOrgId} />
        <span className="dim" style={{ fontSize: "0.78rem" }}>
          {email}
        </span>
        <form action={signOut} style={{ margin: 0 }}>
          <button type="submit" className="btn btn--ghost" title="Déconnexion">
            Quitter
          </button>
        </form>
      </div>
    </header>
  );
}
