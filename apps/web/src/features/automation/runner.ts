import type { createClient } from "@/lib/supabase/server";
import { dispatchAction, type DispatchContext } from "./dispatcher";

type DB = Awaited<ReturnType<typeof createClient>>;

/**
 * Execute a workflow's steps in order, calling engine APIs via the dispatcher.
 * Updates the execution status + logs. Delays are recorded (real timed delays
 * are scheduled by the Agent later — not blocking here). Safety: on any error
 * the execution is marked failed and the run stops; it never leaves an engine
 * mid-mutation beyond the already-logged actions.
 */
export async function runExecution(
  supabase: DB,
  orgId: string,
  executionId: string,
  ctx: DispatchContext,
): Promise<void> {
  const startedAt = Date.now();

  const { data: exec } = await supabase
    .from("automation_executions")
    .select("workflow_id")
    .eq("id", executionId)
    .maybeSingle();
  if (!exec) return;

  const { data: steps } = await supabase
    .from("automation_actions")
    .select("kind, ref, params, position")
    .eq("workflow_id", exec.workflow_id)
    .order("position", { ascending: true });

  await supabase
    .from("automation_executions")
    .update({ status: "running", started_at: new Date(startedAt).toISOString() })
    .eq("id", executionId);

  try {
    for (const step of (steps ?? []) as any[]) {
      if (step.kind === "end") break;
      if (step.kind === "delay") {
        await supabase.from("automation_logs").insert({
          organization_id: orgId,
          execution_id: executionId,
          level: "info",
          action_ref: "delay",
          message: `Délai ${step.params?.ms ?? 0} ms`,
          metadata: step.params ?? {},
        });
        continue;
      }
      if (step.kind === "condition") {
        await supabase.from("automation_logs").insert({
          organization_id: orgId,
          execution_id: executionId,
          level: "info",
          action_ref: step.ref ?? "condition",
          message: `Condition évaluée: ${step.ref ?? "?"}`,
          metadata: step.params ?? {},
        });
        continue;
      }
      // action
      await dispatchAction(supabase, orgId, executionId, step.ref ?? "log_event", step.params ?? {}, ctx);
    }

    await supabase
      .from("automation_executions")
      .update({
        status: "completed",
        finished_at: new Date().toISOString(),
        duration_ms: Date.now() - startedAt,
      })
      .eq("id", executionId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    await supabase.from("automation_logs").insert({
      organization_id: orgId,
      execution_id: executionId,
      level: "error",
      action_ref: "runner",
      message,
    });
    await supabase
      .from("automation_executions")
      .update({
        status: "failed",
        finished_at: new Date().toISOString(),
        duration_ms: Date.now() - startedAt,
        error: message,
      })
      .eq("id", executionId);
  }
}
