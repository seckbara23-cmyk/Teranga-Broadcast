export type AiMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
};

export type AiRecommendation = {
  id: string;
  matchId: string | null;
  kind: string;
  title: string;
  detail: string | null;
  severity: "info" | "warn";
  status: "open" | "accepted" | "rejected" | "dismissed";
  action: Record<string, any>;
  createdAt: string;
};

export type AiTask = {
  id: string;
  kind: string;
  title: string;
  status: "draft" | "approved" | "executed" | "rejected" | "error";
  params: Record<string, any>;
  result: Record<string, any>;
  createdAt: string;
};

export const TASK_KIND_LABEL: Record<string, string> = {
  create_playlist: "Créer une playlist",
  generate_report: "Générer un rapport",
  tag_media: "Étiqueter média",
  organize_archive: "Organiser l'archive",
  draft_summary: "Rédiger un résumé",
};
