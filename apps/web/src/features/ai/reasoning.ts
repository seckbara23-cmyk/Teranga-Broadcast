import type { AiContext } from "./context";

export type RecRule = {
  signature: string;
  kind: string;
  title: string;
  detail: string;
  severity: "info" | "warn";
  action: Record<string, unknown>;
};

/** Rule-based recommendations (advisory only — NO autonomous execution). */
export function generateRecommendations(
  ctx: AiContext,
  matchId: string | null,
): RecRule[] {
  const recs: RecRule[] = [];
  const mid = matchId ?? "org";
  const ready = ctx.replay.clips.filter((c) => c.status === "ready").length;

  if (ready > 0 && ctx.replay.queueCount === 0) {
    recs.push({ signature: `show_replay:${mid}`, kind: "suggest_show_replay", title: "Clip replay prêt", detail: `${ready} clip(s) prêt(s). Suggérer la mise en file / diffusion.`, severity: "info", action: { engine: "replay", action: "queue_replay" } });
  }
  if (ctx.graphics.event) {
    recs.push({ signature: `hide_event_graphic:${mid}`, kind: "suggest_hide_graphic", title: "Graphique événement actif", detail: `Le graphique « ${ctx.graphics.event} » est à l'antenne. Suggérer de le masquer.`, severity: "warn", action: { engine: "graphics", action: "hide_graphic", params: { slot: "event" } } });
  }
  if (ctx.replay.queueCount >= 3) {
    recs.push({ signature: `reorder_queue:${mid}`, kind: "suggest_reorder", title: "File replay chargée", detail: `${ctx.replay.queueCount} clips en file. Suggérer de réordonner.`, severity: "info", action: { engine: "replay" } });
  }
  if (ctx.tactics.sessionCount >= 3) {
    recs.push({ signature: `match_report:${mid}`, kind: "suggest_report", title: "Plusieurs analyses tactiques", detail: `${ctx.tactics.sessionCount} sessions. Suggérer un rapport de match.`, severity: "info", action: { task: "draft_summary" } });
  }
  if (ctx.agent.diskPercent != null && ctx.agent.diskPercent > 80) {
    recs.push({ signature: `disk_cleanup`, kind: "suggest_cleanup", title: "Espace disque faible", detail: `Disque à ${ctx.agent.diskPercent}%. Suggérer un nettoyage de l'archive.`, severity: "warn", action: { engine: "media" } });
  }
  if (ctx.automation.pendingApprovals > 0) {
    recs.push({ signature: `automation_approvals`, kind: "suggest_review", title: "Approbations automation", detail: `${ctx.automation.pendingApprovals} workflow(s) en attente d'approbation.`, severity: "warn", action: { engine: "automation" } });
  }
  return recs;
}

function section(title: string, body: string): string {
  return `## ${title}\n${body}\n`;
}

/** Structured match summary (markdown). No PDF yet. */
export function buildMatchSummary(ctx: AiContext): string {
  const ev = ctx.production.events;
  const list = (pred: (t: string) => boolean) =>
    ev.filter((e) => pred(e.type)).map((e) => `- ${e.clockLabel ?? "—"} ${e.label ?? e.type}`).join("\n") || "- aucun";
  return [
    `# Résumé — ${ctx.match?.title ?? "Match"}`,
    section("Aperçu", `${ctx.production.home ?? "Dom."} ${ctx.production.score.home} – ${ctx.production.score.away} ${ctx.production.away ?? "Ext."} · ${ctx.production.status} · ${ctx.match?.competition ?? "—"}`),
    section("Buts", list((t) => t === "goal")),
    section("Cartons", list((t) => t === "card")),
    section("Changements", list((t) => t === "substitution")),
    section("Replay", `${ctx.replay.clipCount} clip(s), ${ctx.replay.queueCount} en file`),
    section("Graphiques utilisés", `scorebug: ${ctx.graphics.scorebug ? "oui" : "non"}, événement: ${ctx.graphics.event ?? "aucun"}`),
    section("Sessions tactiques", ctx.tactics.sessions.map((s) => `- ${s.title}`).join("\n") || "- aucune"),
    section("Assets média", `${ctx.media.assetCount} asset(s), ${ctx.media.collectionCount} collection(s)`),
    section("Activité automation", `${ctx.automation.recentExecutions} exécution(s), ${ctx.automation.pendingApprovals} en attente`),
  ].join("\n");
}

/** Production / broadcast report (markdown). */
export function buildBroadcastReport(ctx: AiContext): string {
  return [
    `# Rapport de production — ${ctx.match?.title ?? "Match"}`,
    section("Utilisation Replay", `${ctx.replay.clipCount} clip(s) créés, ${ctx.replay.queueCount} en file`),
    section("Utilisation Graphiques", `scorebug ${ctx.graphics.scorebug ? "actif" : "inactif"}, lower third ${ctx.graphics.lowerThird ? "utilisé" : "non"}`),
    section("Santé technique", `agent ${ctx.agent.online ? "en ligne" : "hors ligne"}, OBS ${ctx.agent.obsConnected ? "connecté" : "non connecté"}, disque ${ctx.agent.diskPercent ?? "—"}%`),
    section("Automation", `${ctx.automation.workflowCount} workflow(s), ${ctx.automation.recentExecutions} exécution(s)`),
  ].join("\n");
}
