import { createClient } from "@/lib/supabase/server";
import { mapExecution } from "./map";
import type { Execution, TriggerType, Workflow, WorkflowStep } from "./types";

export { mapExecution };

function mapWorkflow(w: any): Workflow {
  const steps: WorkflowStep[] = (w.automation_actions ?? [])
    .map((s: any) => ({ id: s.id, position: s.position, kind: s.kind, ref: s.ref, params: s.params ?? {} }))
    .sort((a: WorkflowStep, b: WorkflowStep) => a.position - b.position);
  return {
    id: w.id,
    name: w.name,
    description: w.description,
    template: w.template,
    enabled: w.enabled,
    approvalMode: w.approval_mode,
    triggerType: (w.automation_rules?.[0]?.trigger_type ?? "manual") as TriggerType,
    steps,
  };
}

export async function listWorkflows(orgId: string): Promise<Workflow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("automation_workflows")
    .select("*, automation_actions(*), automation_rules(trigger_type)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  return (data ?? []).map(mapWorkflow);
}

export async function listExecutions(
  orgId: string,
  limit = 50,
): Promise<Execution[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("automation_executions")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map(mapExecution);
}
