"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { quickAsk } from "@/features/ai/actions";

const WS_LABEL: Record<string, string> = {
  production: "Production",
  replay: "Replay",
  graphics: "Graphismes",
  tactics: "Tactique",
  timeline: "Chronologie",
  media: "Média",
  automation: "Automatisation",
  health: "Santé",
  global: "Plateforme",
};

function deriveContext(pathname: string): { workspace: string; matchId: string | null; href: string } {
  const m = pathname.match(/^\/matches\/([^/]+)(?:\/([^/]+))?/);
  if (m) {
    const matchId = m[1] ?? null;
    const workspace = m[2] ?? "production";
    return { workspace, matchId, href: matchId ? `/ai?match=${matchId}` : "/ai" };
  }
  if (pathname.startsWith("/media")) return { workspace: "media", matchId: null, href: "/ai" };
  if (pathname.startsWith("/automation")) return { workspace: "automation", matchId: null, href: "/ai" };
  if (pathname.startsWith("/health")) return { workspace: "health", matchId: null, href: "/ai" };
  return { workspace: "global", matchId: null, href: "/ai" };
}

/** Persistent copilot — collapsed by default, expandable, aware of the current
 *  workspace. Quick-ask answers inline without leaving the page. */
export function AiPanel() {
  const pathname = usePathname();
  const { workspace, matchId, href } = deriveContext(pathname);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (pathname.startsWith("/ai")) return null; // full workspace already open

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    setLoading(true);
    try {
      const a = await quickAsk(workspace, matchId, q.trim());
      setAnswer(a);
      setQ("");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button className="ai-fab" onClick={() => setOpen(true)} title="Copilote IA">
        ✦ Copilote
      </button>
    );
  }

  return (
    <div className="ai-panel">
      <div className="ai-panel__head">
        <span className="ai-panel__title">✦ Copilote</span>
        <span className="dim" style={{ fontSize: "0.7rem" }}>{WS_LABEL[workspace] ?? workspace}</span>
        <button className="iconbtn" onClick={() => setOpen(false)} title="Réduire" style={{ marginLeft: "auto" }}>—</button>
      </div>
      <div className="ai-panel__body">
        {answer ? <pre className="ai-result" style={{ maxHeight: "30vh" }}>{answer}</pre> : <p className="dim" style={{ fontSize: "0.8rem" }}>Je connais le contexte « {WS_LABEL[workspace] ?? workspace} ». Posez une question.</p>}
      </div>
      <form className="ai-panel__foot" onSubmit={onSubmit}>
        <input className="input" placeholder="Demander…" value={q} onChange={(e) => setQ(e.target.value)} disabled={loading} />
        <button className="btn btn--primary" disabled={loading}>{loading ? "…" : "↑"}</button>
      </form>
      <div className="ai-panel__link">
        <Link href={href} className="dim" style={{ fontSize: "0.75rem" }}>Ouvrir le copilote complet →</Link>
      </div>
    </div>
  );
}
