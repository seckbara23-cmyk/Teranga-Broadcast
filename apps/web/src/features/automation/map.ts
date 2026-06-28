import type { Execution } from "./types";

/** Pure mapper — safe on client and server. */
export function mapExecution(r: any): Execution {
  return {
    id: r.id,
    workflowId: r.workflow_id,
    status: r.status,
    triggerType: r.trigger_type,
    operatorLabel: r.operator_label,
    durationMs: r.duration_ms,
    error: r.error,
    createdAt: r.created_at,
  };
}
