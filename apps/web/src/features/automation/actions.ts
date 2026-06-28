"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { resolveTenant } from "@/features/auth/tenant";
import { runExecution } from "./runner";
import { TEMPLATES, type ApprovalMode, type NodeKind, type TriggerType } from "./types";

async function ctx() {
  const tenant = await resolveTenant();
  if (!tenant.currentOrg) throw new Error("No active organization");
  const supabase = await createClient();
  return { supabase, orgId: tenant.currentOrg.id, operator: tenant.user.email, userId: tenant.user.id };
}

function revalidate() {
  revalidatePath("/automation");
}

export async function createWorkflowFromTemplate(templateKey: string) {
  const { supabase, orgId, operator, userId } = await ctx();
  const tpl = TEMPLATES.find((t) => t.key === templateKey) ?? TEMPLATES[TEMPLATES.length - 1]!;

  const { data: wf } = await supabase
    .from("automation_workflows")
    .insert({
      organization_id: orgId,
      name: tpl.name,
      template: tpl.key,
      approval_mode: tpl.approvalMode,
      operator_label: operator,
      created_by: userId,
    })
    .select("id")
    .single();
  if (!wf) return;

  await supabase.from("automation_rules").insert({
    organization_id: orgId,
    workflow_id: wf.id,
    trigger_type: tpl.triggerType,
  });

  await supabase.from("automation_actions").insert(
    tpl.steps.map((s, i) => ({
      organization_id: orgId,
      workflow_id: wf.id,
      position: i,
      kind: s.kind,
      ref: s.ref ?? null,
      params: s.params ?? {},
    })),
  );
  revalidate();
}

export async function updateWorkflow(
  workflowId: string,
  patch: { name?: string; enabled?: boolean; approval_mode?: ApprovalMode },
) {
  const { supabase } = await ctx();
  await supabase.from("automation_workflows").update(patch).eq("id", workflowId);
  revalidate();
}

export async function setWorkflowTrigger(workflowId: string, triggerType: TriggerType) {
  const { supabase, orgId } = await ctx();
  const { data: rule } = await supabase
    .from("automation_rules")
    .select("id")
    .eq("workflow_id", workflowId)
    .limit(1)
    .maybeSingle();
  if (rule) {
    await supabase.from("automation_rules").update({ trigger_type: triggerType }).eq("id", rule.id);
  } else {
    await supabase.from("automation_rules").insert({ organization_id: orgId, workflow_id: workflowId, trigger_type: triggerType });
  }
  revalidate();
}

export async function deleteWorkflow(workflowId: string) {
  const { supabase } = await ctx();
  await supabase.from("automation_workflows").delete().eq("id", workflowId);
  revalidate();
}

export async function addStep(
  workflowId: string,
  kind: NodeKind,
  ref: string | null,
  params: Record<string, unknown> = {},
) {
  const { supabase, orgId } = await ctx();
  // Insert before the trailing 'end' node if present.
  const { data: steps } = await supabase
    .from("automation_actions")
    .select("id, position, kind")
    .eq("workflow_id", workflowId)
    .order("position", { ascending: true });
  const endNode = (steps ?? []).find((s: any) => s.kind === "end");
  const position = endNode ? endNode.position : (steps?.length ?? 0);
  if (endNode) {
    await supabase.from("automation_actions").update({ position: position + 1 }).eq("id", endNode.id);
  }
  await supabase.from("automation_actions").insert({
    organization_id: orgId,
    workflow_id: workflowId,
    position,
    kind,
    ref,
    params,
  });
  revalidate();
}

export async function deleteStep(stepId: string) {
  const { supabase } = await ctx();
  await supabase.from("automation_actions").delete().eq("id", stepId);
  revalidate();
}

export async function moveStep(stepId: string, direction: "up" | "down") {
  const { supabase } = await ctx();
  const { data: step } = await supabase
    .from("automation_actions")
    .select("id, workflow_id, position")
    .eq("id", stepId)
    .single();
  if (!step) return;
  const base = supabase.from("automation_actions").select("id, position").eq("workflow_id", step.workflow_id);
  const { data: neighbors } =
    direction === "up"
      ? await base.lt("position", step.position).order("position", { ascending: false }).limit(1)
      : await base.gt("position", step.position).order("position", { ascending: true }).limit(1);
  const n = neighbors?.[0];
  if (!n) return;
  await supabase.from("automation_actions").update({ position: n.position }).eq("id", step.id);
  await supabase.from("automation_actions").update({ position: step.position }).eq("id", n.id);
  revalidate();
}

/** Manually run a workflow (or fire it from a trigger). Respects approval mode. */
export async function runWorkflow(
  workflowId: string,
  opts: { matchId?: string | null; source?: string; triggerType?: string } = {},
) {
  const { supabase, orgId, operator, userId } = await ctx();

  const { data: wf } = await supabase
    .from("automation_workflows")
    .select("enabled, approval_mode")
    .eq("id", workflowId)
    .maybeSingle();
  if (!wf || !wf.enabled || wf.approval_mode === "disabled") {
    revalidate();
    return;
  }

  const { data: trig } = await supabase
    .from("automation_triggers")
    .insert({
      organization_id: orgId,
      trigger_type: opts.triggerType ?? "manual",
      source: opts.source ?? "manual",
      match_id: opts.matchId ?? null,
      status: "handled",
    })
    .select("id")
    .single();

  const pending = wf.approval_mode === "ask_operator";
  const { data: exec } = await supabase
    .from("automation_executions")
    .insert({
      organization_id: orgId,
      workflow_id: workflowId,
      trigger_id: trig?.id ?? null,
      match_id: opts.matchId ?? null,
      trigger_type: opts.triggerType ?? "manual",
      status: pending ? "pending_approval" : "running",
      operator_label: operator,
      created_by: userId,
    })
    .select("id")
    .single();
  if (!exec) return;

  if (!pending) {
    await runExecution(supabase, orgId, exec.id, { matchId: opts.matchId ?? null });
  }
  revalidate();
}

export async function approveExecution(executionId: string, matchId?: string | null) {
  const { supabase, orgId } = await ctx();
  const { data: e } = await supabase
    .from("automation_executions")
    .select("status, match_id")
    .eq("id", executionId)
    .maybeSingle();
  if (!e || e.status !== "pending_approval") return;
  await runExecution(supabase, orgId, executionId, { matchId: matchId ?? e.match_id ?? null });
  revalidate();
}

export async function rejectExecution(executionId: string) {
  const { supabase } = await ctx();
  await supabase
    .from("automation_executions")
    .update({ status: "rejected", finished_at: new Date().toISOString() })
    .eq("id", executionId)
    .eq("status", "pending_approval");
  revalidate();
}

export async function cancelExecution(executionId: string) {
  const { supabase } = await ctx();
  await supabase
    .from("automation_executions")
    .update({ status: "cancelled", finished_at: new Date().toISOString() })
    .eq("id", executionId)
    .in("status", ["pending_approval", "running"]);
  revalidate();
}

export async function retryExecution(executionId: string) {
  const { supabase } = await ctx();
  const { data: e } = await supabase
    .from("automation_executions")
    .select("workflow_id, match_id")
    .eq("id", executionId)
    .maybeSingle();
  if (e) await runWorkflow(e.workflow_id, { matchId: e.match_id, source: "retry" });
}
