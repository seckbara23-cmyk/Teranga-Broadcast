"use client";

import { useState, useTransition } from "react";
import { useExecutions } from "./use-executions";
import { WorkflowEditor } from "./workflow-editor";
import { StatusCard } from "@/components/production/status-card";
import {
  approveExecution,
  rejectExecution,
  cancelExecution,
  retryExecution,
  runWorkflow,
  updateWorkflow,
  createWorkflowFromTemplate,
} from "@/features/automation/actions";
import {
  STATUS_DOT,
  STATUS_LABEL,
  TRIGGER_LABEL,
  APPROVAL_LABEL,
  TEMPLATES,
  type Execution,
  type Workflow,
} from "@/features/automation/types";

function ago(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function AutomationWorkspace({
  orgId,
  workflows,
  initialExecutions,
}: {
  orgId: string;
  workflows: Workflow[];
  initialExecutions: Execution[];
}) {
  const executions = useExecutions(orgId, initialExecutions);
  const [pending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(workflows[0]?.id ?? null);
  const [template, setTemplate] = useState(TEMPLATES[0]!.key);

  const wfName = (id: string) => workflows.find((w) => w.id === id)?.name ?? "Workflow";
  const pendingApprovals = executions.filter((e) => e.status === "pending_approval");
  const failed = executions.filter((e) => e.status === "failed").length;
  const running = executions.filter((e) => e.status === "running").length;
  const selected = workflows.find((w) => w.id === selectedId) ?? null;

  return (
    <div style={{ display: "grid", gap: "1.1rem" }}>
      {/* Health */}
      <div className="scard-grid">
        <StatusCard label="Workflows actifs" state="connected" value={String(workflows.filter((w) => w.enabled).length)} mono />
        <StatusCard label="En cours" state={running ? "connecting" : "idle"} value={String(running)} mono />
        <StatusCard label="En attente d'appro." state={pendingApprovals.length ? "warn" : "idle"} value={String(pendingApprovals.length)} mono />
        <StatusCard label="Échecs" state={failed ? "warn" : "idle"} value={String(failed)} mono />
      </div>

      {/* Pending approvals — human in the loop */}
      {pendingApprovals.length > 0 ? (
        <section className="panel">
          <div className="panel__header">
            <span className="panel__title">Approbations en attente</span>
          </div>
          <div className="panel__body" style={{ display: "grid", gap: "0.4rem" }}>
            {pendingApprovals.map((e) => (
              <div key={e.id} className="row" style={{ justifyContent: "space-between" }}>
                <span className="row" style={{ gap: "0.5rem" }}>
                  <span className="status__dot status__dot--warn" />
                  <strong>{wfName(e.workflowId)}</strong>
                  <span className="dim" style={{ fontSize: "0.78rem" }}>{e.triggerType} · {e.operatorLabel}</span>
                </span>
                <span className="row" style={{ gap: "0.4rem" }}>
                  <button className="btn btn--primary" disabled={pending} onClick={() => startTransition(() => approveExecution(e.id))}>Approuver</button>
                  <button className="btn btn--ghost" disabled={pending} onClick={() => startTransition(() => rejectExecution(e.id))}>Rejeter</button>
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <div className="auto-cols">
        {/* Workflows */}
        <section className="panel">
          <div className="panel__header">
            <span className="panel__title">Workflows</span>
            <span className="row" style={{ gap: "0.4rem" }}>
              <select className="select" value={template} onChange={(e) => setTemplate(e.target.value)} style={{ maxWidth: "11rem" }}>
                {TEMPLATES.map((t) => <option key={t.key} value={t.key}>{t.name}</option>)}
              </select>
              <button className="btn" disabled={pending} onClick={() => startTransition(() => createWorkflowFromTemplate(template))}>+ Créer</button>
            </span>
          </div>
          <div className="panel__body" style={{ display: "grid", gap: "0.4rem" }}>
            {workflows.length === 0 ? (
              <div className="empty">Aucun workflow. Créez-en un depuis un modèle.</div>
            ) : (
              workflows.map((w) => (
                <div key={w.id} className={`wf-row ${selectedId === w.id ? "wf-row--sel" : ""}`} onClick={() => setSelectedId(w.id)}>
                  <span className={`status__dot ${w.enabled ? "status__dot--ok" : "status__dot--idle"}`} />
                  <span className="wf-row__name">{w.name}</span>
                  <span className="dim" style={{ fontSize: "0.72rem" }}>{TRIGGER_LABEL[w.triggerType]} · {APPROVAL_LABEL[w.approvalMode]}</span>
                  <button className="btn btn--ghost" disabled={pending} onClick={(e) => { e.stopPropagation(); startTransition(() => runWorkflow(w.id, { source: "manual" })); }}>▶</button>
                  <button className="iconbtn" title={w.enabled ? "Désactiver" : "Activer"} disabled={pending}
                    onClick={(e) => { e.stopPropagation(); startTransition(() => updateWorkflow(w.id, { enabled: !w.enabled })); }}>
                    {w.enabled ? "⏻" : "○"}
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Editor */}
        <section className="panel">
          <div className="panel__header"><span className="panel__title">Éditeur de workflow</span></div>
          <div className="panel__body">
            {selected ? <WorkflowEditor workflow={selected} /> : <div className="empty">Sélectionnez un workflow.</div>}
          </div>
        </section>
      </div>

      {/* Execution history */}
      <section className="panel">
        <div className="panel__header">
          <span className="panel__title">Historique d&apos;exécution</span>
          <span className="dim" style={{ fontSize: "0.75rem" }}>Temps réel</span>
        </div>
        <div className="panel__body">
          {executions.length === 0 ? (
            <div className="empty">Aucune exécution.</div>
          ) : (
            <table className="rq">
              <thead><tr>{["Heure", "Workflow", "Déclencheur", "Opérateur", "Durée", "Statut", ""].map((h) => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {executions.map((e) => (
                  <tr key={e.id} className="rq__row">
                    <td className="mono dim">{ago(e.createdAt)}</td>
                    <td>{wfName(e.workflowId)}</td>
                    <td className="dim">{e.triggerType ?? "—"}</td>
                    <td className="dim">{e.operatorLabel ?? "—"}</td>
                    <td className="mono">{e.durationMs != null ? `${e.durationMs}ms` : "—"}</td>
                    <td>
                      <span className="status">
                        <span className={`status__dot ${STATUS_DOT[e.status]}`} />
                        {STATUS_LABEL[e.status]}
                      </span>
                    </td>
                    <td>
                      <div className="rq__actions">
                        {(e.status === "running" || e.status === "pending_approval") ? (
                          <button className="iconbtn" title="Annuler" disabled={pending} onClick={() => startTransition(() => cancelExecution(e.id))}>■</button>
                        ) : null}
                        {(e.status === "failed" || e.status === "completed") ? (
                          <button className="iconbtn" title="Relancer" disabled={pending} onClick={() => startTransition(() => retryExecution(e.id))}>↻</button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
