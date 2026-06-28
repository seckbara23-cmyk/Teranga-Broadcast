"use client";

import { useState, useTransition } from "react";
import { useAi } from "./use-ai";
import {
  sendMessage,
  refreshRecommendations,
  recommendationFeedback,
  approveTask,
  rejectTask,
  createTask,
} from "@/features/ai/actions";
import { TASK_KIND_LABEL, type AiRecommendation, type AiTask } from "@/features/ai/types";
import type { AiContext } from "@/features/ai/context";

const TABS = ["Chat", "Recommandations", "Tâches", "Historique", "Contexte", "Réglages"] as const;
type Tab = (typeof TABS)[number];

const PROMPTS = [
  "Que s'est-il passé en première mi-temps ?",
  "Montre tous les cartons jaunes",
  "Quels graphiques sont actifs ?",
  "Crée un package mi-temps",
  "Trouve tous les moments VAR",
];

export function AiWorkspace({
  orgId,
  conversationId,
  matchId,
  provider,
  context,
  initialMessages,
  initialRecommendations,
  initialTasks,
}: {
  orgId: string;
  conversationId: string;
  matchId: string | null;
  provider: string;
  context: AiContext;
  initialMessages: any[];
  initialRecommendations: AiRecommendation[];
  initialTasks: AiTask[];
}) {
  const { messages, recommendations, tasks } = useAi(orgId, conversationId, initialMessages, initialRecommendations, initialTasks);
  const [tab, setTab] = useState<Tab>("Chat");
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();

  function ask(q: string) {
    if (!q.trim()) return;
    setText("");
    startTransition(() => sendMessage(conversationId, matchId, q));
  }

  return (
    <div className="ai-ws">
      <div className="tabs" style={{ paddingLeft: 0 }}>
        {TABS.map((t) => (
          <button key={t} className={`tab ${tab === t ? "tab--active" : ""}`} onClick={() => setTab(t)}>
            {t}
            {t === "Recommandations" && recommendations.length ? <span className="kbd" style={{ marginLeft: "0.3rem" }}>{recommendations.length}</span> : null}
          </button>
        ))}
      </div>

      {tab === "Chat" ? (
        <div className="panel">
          <div className="panel__body">
            <div className="ai-chat">
              {messages.length === 0 ? <div className="empty">Posez une question sur la production.</div> : null}
              {messages.map((m) => (
                <div key={m.id} className={`ai-msg ai-msg--${m.role}`}>
                  <span className="ai-msg__role">{m.role === "user" ? "Vous" : "Copilote"}</span>
                  <div className="ai-msg__content">{m.content}</div>
                </div>
              ))}
            </div>
            <div className="row" style={{ gap: "0.3rem", flexWrap: "wrap", margin: "0.6rem 0" }}>
              {PROMPTS.map((p) => <button key={p} className="chip" disabled={pending} onClick={() => ask(p)}>{p}</button>)}
            </div>
            <form className="row" style={{ gap: "0.4rem" }} onSubmit={(e) => { e.preventDefault(); ask(text); }}>
              <input className="input" placeholder="Demandez au copilote…" value={text} onChange={(e) => setText(e.target.value)} />
              <button className="btn btn--primary" disabled={pending}>Envoyer</button>
            </form>
          </div>
        </div>
      ) : null}

      {tab === "Recommandations" ? (
        <div className="panel">
          <div className="panel__header">
            <span className="panel__title">Recommandations</span>
            <button className="btn btn--ghost" disabled={pending} onClick={() => startTransition(() => refreshRecommendations(matchId))}>↻ Actualiser</button>
          </div>
          <div className="panel__body" style={{ display: "grid", gap: "0.5rem" }}>
            {recommendations.length === 0 ? <div className="empty">Aucune recommandation.</div> : recommendations.map((r) => (
              <div key={r.id} className="ai-rec">
                <span className={`status__dot ${r.severity === "warn" ? "status__dot--warn" : "status__dot--info"}`} />
                <div style={{ flex: 1 }}>
                  <strong>{r.title}</strong>
                  <div className="dim" style={{ fontSize: "0.8rem" }}>{r.detail}</div>
                </div>
                <div className="row" style={{ gap: "0.3rem" }}>
                  <button className="btn" disabled={pending} onClick={() => startTransition(() => recommendationFeedback(r.id, "accept"))}>Accepter</button>
                  <button className="btn btn--ghost" disabled={pending} onClick={() => startTransition(() => recommendationFeedback(r.id, "reject"))}>Rejeter</button>
                  <button className="btn btn--ghost" disabled={pending} onClick={() => startTransition(() => recommendationFeedback(r.id, "not_useful"))}>Inutile</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {tab === "Tâches" ? (
        <div className="panel">
          <div className="panel__header">
            <span className="panel__title">Tâches</span>
            <span className="row" style={{ gap: "0.3rem" }}>
              <button className="btn btn--ghost" disabled={pending} onClick={() => startTransition(() => createTask("draft_summary", "Résumé du match", matchId))}>+ Résumé</button>
              <button className="btn btn--ghost" disabled={pending} onClick={() => startTransition(() => createTask("generate_report", "Rapport de production", matchId))}>+ Rapport</button>
            </span>
          </div>
          <div className="panel__body" style={{ display: "grid", gap: "0.5rem" }}>
            {tasks.length === 0 ? <div className="empty">Aucune tâche.</div> : tasks.map((t) => (
              <div key={t.id} className="ai-task">
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <span><strong>{t.title}</strong> <span className="dim" style={{ fontSize: "0.75rem" }}>· {TASK_KIND_LABEL[t.kind] ?? t.kind} · {t.status}</span></span>
                  {t.status === "draft" ? (
                    <span className="row" style={{ gap: "0.3rem" }}>
                      <button className="btn btn--primary" disabled={pending} onClick={() => startTransition(() => approveTask(t.id))}>Approuver</button>
                      <button className="btn btn--ghost" disabled={pending} onClick={() => startTransition(() => rejectTask(t.id))}>Rejeter</button>
                    </span>
                  ) : null}
                </div>
                {t.result?.text ? <pre className="ai-result">{t.result.text}</pre> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {tab === "Historique" ? (
        <div className="panel">
          <div className="panel__header"><span className="panel__title">Historique</span></div>
          <div className="panel__body">
            <ul className="clip-list">
              {messages.filter((m) => m.role === "assistant").slice().reverse().map((m) => (
                <li key={m.id} className="clip-row" style={{ cursor: "default" }}>
                  <span className="status__dot status__dot--idle" />
                  <span className="clip-row__name">{m.content.split("\n")[0]}</span>
                  <span className="dim mono" style={{ fontSize: "0.72rem" }}>{new Date(m.createdAt).toLocaleTimeString("fr-FR")}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {tab === "Contexte" ? (
        <div className="panel">
          <div className="panel__header"><span className="panel__title">Contexte structuré</span><span className="dim" style={{ fontSize: "0.75rem" }}>Vu par l&apos;IA (via API moteurs)</span></div>
          <div className="panel__body"><pre className="ai-result">{JSON.stringify(context, null, 2)}</pre></div>
        </div>
      ) : null}

      {tab === "Réglages" ? (
        <div className="panel">
          <div className="panel__header"><span className="panel__title">Réglages</span></div>
          <div className="panel__body" style={{ display: "grid", gap: "0.6rem" }}>
            <div className="media-meta">
              <dt>Fournisseur actif</dt><dd>{provider}</dd>
              <dt>Mode</dt><dd>Assistance uniquement — jamais à l&apos;antenne</dd>
              <dt>Fournisseurs supportés</dt><dd>local, anthropic, openai, google, mistral, ollama</dd>
            </div>
            <p className="dim" style={{ fontSize: "0.8rem", margin: 0 }}>
              Le fournisseur se configure via <code>AI_PROVIDER</code>. Le copilote local fonctionne sans clé API.
              L&apos;IA ne peut rien diffuser, contrôler OBS, supprimer ou exécuter sans approbation explicite.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
