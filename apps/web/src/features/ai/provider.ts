import type { AiContext, AiEventLite } from "./context";

export type ProposedTask = {
  kind: string;
  title: string;
  params: Record<string, unknown>;
} | null;

export type AiAnswer = { content: string; task?: ProposedTask };

/**
 * Provider abstraction — the AI is NOT coupled to any LLM vendor. The active
 * provider is selected by AI_PROVIDER; the default `local` copilot is fully
 * deterministic (no network/key), reasoning over the structured engine context.
 * Cloud adapters (Anthropic / OpenAI / Google / Mistral / Ollama) implement the
 * same interface and can be wired without changing callers.
 */
export interface LLMProvider {
  readonly name: string;
  answer(question: string, context: AiContext): Promise<AiAnswer>;
}

function has(q: string, ...terms: string[]): boolean {
  return terms.some((t) => q.includes(t));
}

function bullets(items: string[]): string {
  return items.length ? items.map((i) => `• ${i}`).join("\n") : "Aucun élément.";
}

function eventLine(e: AiEventLite): string {
  const t = e.team ? (e.team === "home" ? "[DOM]" : "[EXT]") : "";
  return `${e.clockLabel ?? "—"} ${t} ${e.type}${e.label ? ` — ${e.label}` : ""}`.trim();
}

/** Deterministic, provider-free copilot. Reasons over the engine context. */
export class LocalCopilotProvider implements LLMProvider {
  readonly name = "local";

  async answer(question: string, ctx: AiContext): Promise<AiAnswer> {
    const q = question.toLowerCase().trim();
    const ev = ctx.production.events;
    const firstHalf = ev.filter((e) => (e.clockMs ?? 0) < 45 * 60000);
    const secondHalf = ev.filter((e) => (e.clockMs ?? 0) >= 45 * 60000);

    // Score / clock / status
    if (has(q, "score", "résultat", "scoreline")) {
      return { content: `Score actuel : ${ctx.production.home ?? "Dom."} ${ctx.production.score.home} – ${ctx.production.score.away} ${ctx.production.away ?? "Ext."} (${ctx.production.status}).` };
    }
    if (has(q, "clock", "horloge", "statut", "status", "période")) {
      return { content: `Statut du match : ${ctx.production.status}.` };
    }

    // First / second half summary
    if (has(q, "first half", "première mi", "premiere mi", "1re", "1ère")) {
      return { content: `Première mi-temps — ${firstHalf.length} événement(s) :\n${bullets(firstHalf.map(eventLine))}` };
    }
    if (has(q, "second half", "deuxième mi", "2e mi", "seconde mi")) {
      const goals = secondHalf.filter((e) => e.type === "goal");
      if (has(q, "goal", "but")) {
        return { content: `Buts en 2e mi-temps :\n${bullets(goals.map(eventLine))}` };
      }
      return { content: `Deuxième mi-temps — ${secondHalf.length} événement(s) :\n${bullets(secondHalf.map(eventLine))}` };
    }

    // Cards
    if (has(q, "card", "carton", "jaune", "rouge", "yellow", "red")) {
      const cards = ev.filter((e) => e.type === "card");
      return { content: `Cartons (${cards.length}) :\n${bullets(cards.map(eventLine))}` };
    }

    // Goals
    if (has(q, "goal", "but", "scored")) {
      const goals = ev.filter((e) => e.type === "goal");
      return { content: `Buts (${goals.length}) :\n${bullets(goals.map(eventLine))}` };
    }

    // VAR
    if (has(q, "var")) {
      const vars = ev.filter((e) => e.type === "var_review");
      const clips = ctx.replay.clips.filter((c) => c.type === "var");
      return { content: `Moments VAR — ${vars.length} événement(s), ${clips.length} clip(s).\n${bullets([...vars.map(eventLine), ...clips.map((c) => `clip ${c.clock ?? ""} (${c.status})`)])}` };
    }

    // Saves
    if (has(q, "save", "arrêt", "arret")) {
      const clips = ctx.replay.clips.filter((c) => c.type === "save");
      return { content: `Arrêts — ${clips.length} clip(s) :\n${bullets(clips.map((c) => `${c.clock ?? "—"} (${c.status})`))}` };
    }

    // Graphics active
    if (has(q, "graphic", "graphisme", "scorebug", "lower third", "lower-third", "overlay")) {
      const lines = [
        `Scorebug : ${ctx.graphics.scorebug ? "à l'antenne" : "masqué"}`,
        `Lower third : ${ctx.graphics.lowerThird ? "à l'antenne" : "masqué"}`,
        `Graphique événement : ${ctx.graphics.event ?? "aucun"}`,
      ];
      return { content: `Graphiques actifs :\n${bullets(lines)}` };
    }

    // Highlight / package → propose a task
    if (has(q, "highlight", "résumé", "resume", "package", "mi-temps")) {
      return {
        content: "Je peux préparer un package de temps forts. Approuvez la tâche ci-dessous pour le créer (collection Média).",
        task: { kind: "create_playlist", title: "Package temps forts", params: { name: "Temps forts", kind: "halftime_highlights" } },
      };
    }

    // Replays / clips
    if (has(q, "replay", "clip", "ralenti")) {
      return { content: `Replay — ${ctx.replay.clipCount} clip(s), ${ctx.replay.queueCount} en file :\n${bullets(ctx.replay.clips.map((c) => `${c.clock ?? "—"} ${c.type} (${c.status})`))}` };
    }

    // Tactical session
    if (has(q, "tactic", "tactique", "session", "formation")) {
      return {
        content: `Sessions tactiques (${ctx.tactics.sessionCount}) :\n${bullets(ctx.tactics.sessions.map((s) => s.title))}`,
        task: ctx.tactics.sessionCount >= 3 ? { kind: "draft_summary", title: "Rapport d'analyse tactique", params: {} } : null,
      };
    }

    // Health / disk
    if (has(q, "disk", "disque", "health", "santé", "obs", "agent")) {
      return { content: `Agent : ${ctx.agent.online ? "en ligne" : "hors ligne"} · OBS : ${ctx.agent.obsConnected ? "connecté" : "non connecté"} · Disque : ${ctx.agent.diskPercent != null ? `${ctx.agent.diskPercent}%` : "—"}.` };
    }

    // Summary
    if (has(q, "summary", "rapport", "report")) {
      return {
        content: "Je peux générer un résumé structuré du match. Approuvez la tâche pour l'enregistrer.",
        task: { kind: "draft_summary", title: "Résumé du match", params: {} },
      };
    }

    // Fallback — context overview
    return {
      content:
        `Voici ce que je vois${ctx.match ? ` pour « ${ctx.match.title} »` : ""} :\n` +
        bullets([
          `Score ${ctx.production.score.home}–${ctx.production.score.away} (${ctx.production.status})`,
          `${ev.length} événement(s), ${ctx.replay.clipCount} clip(s) replay`,
          `${ctx.graphics.scorebug ? "scorebug à l'antenne" : "scorebug masqué"}`,
          `${ctx.tactics.sessionCount} session(s) tactique(s), ${ctx.media.assetCount} asset(s) média`,
          `${ctx.automation.pendingApprovals} approbation(s) automation en attente`,
        ]) +
        `\n\nDemandez par ex. : « Montre les cartons », « Quels graphiques sont actifs ? », « Crée un package mi-temps ».`,
    };
  }
}

/** Cloud adapter stub — provider-agnostic; configure a key to enable. */
class CloudProviderStub implements LLMProvider {
  constructor(readonly name: string, private readonly model: string) {}
  async answer(): Promise<AiAnswer> {
    throw new Error(
      `Fournisseur IA « ${this.name} » (${this.model}) non configuré — ajoutez une clé API. Le copilote local reste disponible.`,
    );
  }
}

/** Select the active provider. Defaults to the local copilot (no key needed). */
export function getProvider(): LLMProvider {
  const which = (process.env.AI_PROVIDER ?? "local").toLowerCase();
  switch (which) {
    case "anthropic":
      return new CloudProviderStub("anthropic", process.env.AI_MODEL ?? "claude-opus-4-8");
    case "openai":
      return new CloudProviderStub("openai", process.env.AI_MODEL ?? "gpt");
    case "google":
      return new CloudProviderStub("google", process.env.AI_MODEL ?? "gemini");
    case "mistral":
      return new CloudProviderStub("mistral", process.env.AI_MODEL ?? "mistral");
    case "ollama":
      return new CloudProviderStub("ollama", process.env.AI_MODEL ?? "llama");
    default:
      return new LocalCopilotProvider();
  }
}
