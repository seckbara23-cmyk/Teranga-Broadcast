import type { AiMessage, AiRecommendation, AiTask } from "./types";

export function mapMessage(r: any): AiMessage {
  return { id: r.id, role: r.role, content: r.content, createdAt: r.created_at };
}

export function mapRecommendation(r: any): AiRecommendation {
  return {
    id: r.id,
    matchId: r.match_id,
    kind: r.kind,
    title: r.title,
    detail: r.detail,
    severity: r.severity,
    status: r.status,
    action: r.action ?? {},
    createdAt: r.created_at,
  };
}

export function mapTask(r: any): AiTask {
  return {
    id: r.id,
    kind: r.kind,
    title: r.title,
    status: r.status,
    params: r.params ?? {},
    result: r.result ?? {},
    createdAt: r.created_at,
  };
}
