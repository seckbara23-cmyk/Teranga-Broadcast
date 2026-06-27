import type { ReactNode } from "react";
import Link from "next/link";
import { resolveTenant } from "@/features/auth/tenant";
import { createOrganization } from "@/features/auth/actions";
import { listMatchRefs } from "@/features/matches/queries";
import { Sidebar } from "@/components/shell/sidebar";
import { TopBar } from "@/components/shell/top-bar";
import { ShellChrome } from "@/components/shell/shell-chrome";

// Authenticated, per-request rendering (reads cookies / Supabase session).
export const dynamic = "force-dynamic";

/**
 * Broadcast Shell — the operating environment every engine plugs into.
 *
 * resolveTenant() redirects to /login when there is no session. With no
 * organization yet, an onboarding panel is shown instead of the full shell.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const tenant = await resolveTenant();

  if (!tenant.currentOrg) {
    return <Onboarding />;
  }

  const matches = await listMatchRefs();

  return (
    <div className="shell">
      <div className="shell__brand">
        <Link href="/matches" className="brandmark">
          ◢ Teranga
        </Link>
      </div>

      <div className="shell__topbar">
        <TopBar
          email={tenant.user.email}
          memberships={tenant.memberships}
          currentOrgId={tenant.currentOrg.id}
        />
      </div>

      <aside className="shell__sidebar">
        <Sidebar />
      </aside>

      <main className="shell__main">{children}</main>

      <ShellChrome matches={matches} />
    </div>
  );
}

function Onboarding() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      }}
    >
      <div className="panel" style={{ width: "min(28rem, 92vw)" }}>
        <div className="panel__header">
          <span className="panel__title">Bienvenue</span>
        </div>
        <div className="panel__body" style={{ display: "grid", gap: "0.8rem" }}>
          <p className="muted" style={{ margin: 0 }}>
            Vous n&apos;appartenez à aucune organisation. Créez-en une pour
            ouvrir le centre de production.
          </p>
          <form
            action={createOrganization}
            style={{ display: "flex", gap: "0.5rem" }}
          >
            <input
              name="name"
              required
              placeholder="Nom de l'organisation"
              className="input"
            />
            <button type="submit" className="btn btn--primary">
              Créer
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
