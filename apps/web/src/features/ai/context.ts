// AI Context Builder — assembles structured context by calling each engine's
// PUBLIC read API. The AI never queries another engine's raw tables.
import { getMatch } from "@/features/matches/queries";
import { getOrCreateClock, getScore } from "@/features/production/queries";
import { listEvents } from "@/features/events/queries";
import { listClips, listClipQueue } from "@/features/replay/clip-queries";
import { getActiveGraphics } from "@/features/graphics/queries";
import { listSessions } from "@/features/tactics/queries";
import { listAssets, listCollections } from "@/features/media/queries";
import { listWorkflows, listExecutions } from "@/features/automation/queries";
import { getAgents, getDevices } from "@/features/devices/queries";
import { isAgentLive } from "@/features/devices/types";

export type AiEventLite = {
  type: string;
  team: "home" | "away" | null;
  label: string | null;
  clockLabel: string | null;
  clockMs: number | null;
};

export type AiContext = {
  match: { id: string; title: string; competition: string | null } | null;
  production: {
    status: string;
    home: string | null;
    away: string | null;
    score: { home: number; away: number };
    events: AiEventLite[];
  };
  replay: { clipCount: number; queueCount: number; clips: { type: string; clock: string | null; status: string; id: string }[] };
  graphics: { scorebug: boolean; lowerThird: boolean; event: string | null };
  tactics: { sessionCount: number; sessions: { id: string; title: string }[] };
  media: { assetCount: number; collectionCount: number };
  automation: { workflowCount: number; pendingApprovals: number; recentExecutions: number };
  agent: { online: boolean; obsConnected: boolean; diskPercent: number | null };
};

export async function buildContext(
  orgId: string,
  matchId?: string | null,
): Promise<AiContext> {
  const nowMs = Date.now();

  const [media, collections, workflows, executions, agents, devices] = await Promise.all([
    listAssets(orgId),
    listCollections(orgId),
    listWorkflows(orgId),
    listExecutions(orgId),
    getAgents(orgId),
    getDevices(orgId),
  ]);

  let production: AiContext["production"] = {
    status: "—",
    home: null,
    away: null,
    score: { home: 0, away: 0 },
    events: [],
  };
  let replay: AiContext["replay"] = { clipCount: 0, queueCount: 0, clips: [] };
  let graphics: AiContext["graphics"] = { scorebug: true, lowerThird: false, event: null };
  let tactics: AiContext["tactics"] = { sessionCount: 0, sessions: [] };
  let match: AiContext["match"] = null;

  if (matchId) {
    const [m, clock, score, events, clips, queue, g, sessions] = await Promise.all([
      getMatch(matchId),
      getOrCreateClock(matchId),
      getScore(matchId),
      listEvents(matchId),
      listClips(matchId),
      listClipQueue(matchId),
      getActiveGraphics(matchId),
      listSessions(matchId),
    ]);
    if (m) match = { id: m.id, title: m.title, competition: m.competition };
    production = {
      status: clock.status,
      home: m?.home_team ?? null,
      away: m?.away_team ?? null,
      score: { home: score.home, away: score.away },
      events: events.map((e) => ({
        type: e.type,
        team: e.team,
        label: e.label,
        clockLabel: e.payload?.clock_label ?? null,
        clockMs: e.match_clock_ms,
      })),
    };
    replay = {
      clipCount: clips.length,
      queueCount: queue.length,
      clips: clips.slice(0, 30).map((c) => ({ type: c.clipType, clock: c.clockLabel, status: c.status, id: c.id })),
    };
    graphics = {
      scorebug: g.scorebug,
      lowerThird: g.lowerThird.visible,
      event: g.event.visible ? g.event.data?.type ?? null : null,
    };
    tactics = { sessionCount: sessions.length, sessions: sessions.slice(0, 10).map((s) => ({ id: s.id, title: s.title })) };
  }

  const liveAgent = agents.find((a) => isAgentLive(a, nowMs));
  const obs = devices.find((d) => d.deviceType === "obs");

  return {
    match,
    production,
    replay,
    graphics,
    tactics,
    media: { assetCount: media.length, collectionCount: collections.length },
    automation: {
      workflowCount: workflows.length,
      pendingApprovals: executions.filter((e) => e.status === "pending_approval").length,
      recentExecutions: executions.length,
    },
    agent: {
      online: Boolean(liveAgent),
      obsConnected: obs?.status === "connected",
      diskPercent: liveAgent?.health?.diskPercent ?? null,
    },
  };
}
