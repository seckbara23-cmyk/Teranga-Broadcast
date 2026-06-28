"use client";

import { useState, useTransition, type ReactNode } from "react";
import {
  addStep,
  deleteStep,
  moveStep,
  runWorkflow,
  setWorkflowTrigger,
  updateWorkflow,
  deleteWorkflow,
} from "@/features/automation/actions";
import {
  ACTION_LABEL,
  APPROVAL_LABEL,
  TRIGGER_LABEL,
  type ActionType,
  type ApprovalMode,
  type TriggerType,
  type Workflow,
} from "@/features/automation/types";

const ACTIONS = Object.keys(ACTION_LABEL) as ActionType[];
const TRIGGERS = Object.keys(TRIGGER_LABEL) as TriggerType[];
const APPROVALS = Object.keys(APPROVAL_LABEL) as ApprovalMode[];

export function WorkflowEditor({ workflow }: { workflow: Workflow }) {
  const [pending, startTransition] = useTransition();
  const [newAction, setNewAction] = useState<ActionType>("show_graphic");

  function NodeCard({ children, tone }: { children: ReactNode; tone: string }) {
    return <div className={`flow-node flow-node--${tone}`}>{children}</div>;
  }

  return (
    <div className="wf-editor">
      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: "0.6rem" }}>
        <strong style={{ fontSize: "1.05rem" }}>{workflow.name}</strong>
        <div className="row" style={{ gap: "0.4rem" }}>
          <button className="btn btn--primary" disabled={pending} onClick={() => startTransition(() => runWorkflow(workflow.id, { source: "manual" }))}>
            ▶ Exécuter
          </button>
          <button className="btn btn--ghost" disabled={pending} onClick={() => startTransition(() => deleteWorkflow(workflow.id))}>
            Supprimer
          </button>
        </div>
      </div>

      <div className="row" style={{ gap: "0.8rem", flexWrap: "wrap", margin: "0.6rem 0" }}>
        <label className="field" style={{ minWidth: "12rem" }}>
          <span className="field__label">Approbation</span>
          <select className="select" value={workflow.approvalMode} disabled={pending}
            onChange={(e) => startTransition(() => updateWorkflow(workflow.id, { approval_mode: e.target.value as ApprovalMode }))}>
            {APPROVALS.map((a) => <option key={a} value={a}>{APPROVAL_LABEL[a]}</option>)}
          </select>
        </label>
        <label className="field" style={{ minWidth: "12rem" }}>
          <span className="field__label">État</span>
          <select className="select" value={workflow.enabled ? "1" : "0"} disabled={pending}
            onChange={(e) => startTransition(() => updateWorkflow(workflow.id, { enabled: e.target.value === "1" }))}>
            <option value="1">Activé</option>
            <option value="0">Désactivé</option>
          </select>
        </label>
      </div>

      <div className="flow">
        <NodeCard tone="trigger">
          <span className="flow-node__kind">Déclencheur</span>
          <select className="select" value={workflow.triggerType} disabled={pending}
            onChange={(e) => startTransition(() => setWorkflowTrigger(workflow.id, e.target.value as TriggerType))}>
            {TRIGGERS.map((t) => <option key={t} value={t}>{TRIGGER_LABEL[t]}</option>)}
          </select>
        </NodeCard>

        {workflow.steps.map((s, i) => (
          <div key={s.id}>
            <div className="flow-arrow">↓</div>
            <NodeCard tone={s.kind === "end" ? "end" : s.kind === "delay" ? "delay" : s.kind === "condition" ? "cond" : "action"}>
              <span className="flow-node__kind">
                {s.kind === "action" ? "Action" : s.kind === "delay" ? "Délai" : s.kind === "condition" ? "Condition" : "Fin"}
              </span>
              <span className="flow-node__label">
                {s.kind === "action" ? (ACTION_LABEL[(s.ref ?? "log_event") as ActionType] ?? s.ref)
                  : s.kind === "delay" ? `${s.params.ms ?? 0} ms`
                  : s.kind === "condition" ? s.ref
                  : "—"}
              </span>
              {s.kind !== "end" ? (
                <div className="flow-node__ops">
                  <button className="iconbtn" disabled={pending || i === 0} onClick={() => startTransition(() => moveStep(s.id, "up"))}>↑</button>
                  <button className="iconbtn" disabled={pending} onClick={() => startTransition(() => moveStep(s.id, "down"))}>↓</button>
                  <button className="iconbtn iconbtn--danger" disabled={pending} onClick={() => startTransition(() => deleteStep(s.id))}>✕</button>
                </div>
              ) : null}
            </NodeCard>
          </div>
        ))}
      </div>

      <div className="row" style={{ gap: "0.4rem", flexWrap: "wrap", marginTop: "0.8rem" }}>
        <select className="select" value={newAction} onChange={(e) => setNewAction(e.target.value as ActionType)} style={{ maxWidth: "12rem" }}>
          {ACTIONS.map((a) => <option key={a} value={a}>{ACTION_LABEL[a]}</option>)}
        </select>
        <button className="btn" disabled={pending} onClick={() => startTransition(() => addStep(workflow.id, "action", newAction, {}))}>+ Action</button>
        <button className="btn btn--ghost" disabled={pending} onClick={() => startTransition(() => addStep(workflow.id, "delay", null, { ms: 2000 }))}>+ Délai</button>
        <button className="btn btn--ghost" disabled={pending} onClick={() => startTransition(() => addStep(workflow.id, "condition", "manual_approval", {}))}>+ Condition</button>
      </div>
    </div>
  );
}
