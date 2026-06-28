import { resolveTenant } from "@/features/auth/tenant";
import { listWorkflows, listExecutions } from "@/features/automation/queries";
import { AutomationWorkspace } from "@/components/automation/automation-workspace";

export const dynamic = "force-dynamic";

/**
 * Automation — the orchestration layer. Workflows coordinate other engines by
 * calling their public APIs (Graphics/Replay/Media); Automation owns only its
 * own tables. Human-in-the-loop via per-workflow approval modes.
 */
export default async function AutomationPage() {
  const tenant = await resolveTenant();
  const orgId = tenant.currentOrg?.id;

  if (!orgId) {
    return (
      <div className="page">
        <div className="empty">Aucune organisation active.</div>
      </div>
    );
  }

  const [workflows, executions] = await Promise.all([
    listWorkflows(orgId),
    listExecutions(orgId),
  ]);

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1 className="h1">Automatisation</h1>
          <p className="dim" style={{ margin: "0.25rem 0 0", fontSize: "0.82rem" }}>
            Workflows orchestrant Production, Replay, Graphismes, Tactique & Média
          </p>
        </div>
      </div>
      <AutomationWorkspace orgId={orgId} workflows={workflows} initialExecutions={executions} />
    </div>
  );
}
