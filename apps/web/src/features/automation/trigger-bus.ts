import { createClient } from "@/lib/supabase/server";
import { resolveTenant } from "@/features/auth/tenant";
import { runWorkflow } from "./actions";

/**
 * Automation trigger API. Other engines NOTIFY Automation of events through this
 * function (they never write automation tables). Here, Production calls it after
 * logging a match event; Automation evaluates its rules and runs matching
 * workflows (respecting each workflow's approval mode).
 */
export async function fireMatchEventTriggers(
  matchId: string,
  eventType: string,
): Promise<void> {
  const tenant = await resolveTenant();
  if (!tenant.currentOrg) return;
  const supabase = await createClient();

  const { data: rules } = await supabase
    .from("automation_rules")
    .select("workflow_id, automation_workflows(enabled)")
    .eq("organization_id", tenant.currentOrg.id)
    .eq("trigger_type", "match_event")
    .eq("enabled", true);

  for (const r of (rules ?? []) as any[]) {
    if (r.automation_workflows?.enabled === false) continue;
    await runWorkflow(r.workflow_id, {
      matchId,
      source: `match_event:${eventType}`,
      triggerType: "match_event",
    });
  }
}
