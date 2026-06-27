import { resolveTenant } from "@/features/auth/tenant";
import { getAgents, getDevices } from "@/features/devices/queries";
import { SystemHealth } from "@/components/devices/system-health";

export const dynamic = "force-dynamic";

/**
 * System Health — org-level view of the Teranga Agent(s) and broadcast hardware.
 * Reads the Kernel AgentRegistry live. No control.
 */
export default async function HealthPage() {
  const tenant = await resolveTenant();
  const orgId = tenant.currentOrg?.id;

  if (!orgId) {
    return (
      <div className="page">
        <div className="empty">Aucune organisation active.</div>
      </div>
    );
  }

  const [agents, devices] = await Promise.all([
    getAgents(orgId),
    getDevices(orgId),
  ]);

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1 className="h1">Santé système</h1>
          <p className="dim" style={{ margin: "0.25rem 0 0", fontSize: "0.82rem" }}>
            Agent Teranga & matériel de diffusion
          </p>
        </div>
      </div>
      <SystemHealth orgId={orgId} initialAgents={agents} initialDevices={devices} />
    </div>
  );
}
