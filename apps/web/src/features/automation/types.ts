/** Broadcast Automation Engine — domain types. */

export type TriggerType =
  | "match_event"
  | "replay_ready"
  | "graphic_hidden"
  | "graphic_shown"
  | "clip_created"
  | "clip_played"
  | "match_status_changed"
  | "timer"
  | "manual"
  | "operator_action";
// future: "ai_recommendation"

export type ActionType =
  | "show_graphic"
  | "hide_graphic"
  | "queue_replay"
  | "move_replay"
  | "start_playlist"
  | "create_media_collection"
  | "tag_media_asset"
  | "notify_operator"
  | "log_event"
  | "open_tactics_session"
  | "display_prompt";

export type ConditionType =
  | "score"
  | "match_status"
  | "replay_exists"
  | "graphic_active"
  | "team"
  | "operator_role"
  | "clock_time"
  | "manual_approval";

export type NodeKind = "condition" | "delay" | "action" | "end";
export type ApprovalMode = "automatic" | "ask_operator" | "disabled";
export type ExecutionStatus =
  | "pending_approval"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "rejected";

export const TRIGGER_LABEL: Record<TriggerType, string> = {
  match_event: "Événement match",
  replay_ready: "Replay prêt",
  graphic_hidden: "Graphique masqué",
  graphic_shown: "Graphique affiché",
  clip_created: "Clip créé",
  clip_played: "Clip diffusé",
  match_status_changed: "Statut match changé",
  timer: "Minuteur",
  manual: "Manuel",
  operator_action: "Action opérateur",
};

export const ACTION_LABEL: Record<ActionType, string> = {
  show_graphic: "Afficher graphique",
  hide_graphic: "Masquer graphique",
  queue_replay: "Mettre replay en file",
  move_replay: "Déplacer replay",
  start_playlist: "Lancer playlist",
  create_media_collection: "Créer collection média",
  tag_media_asset: "Étiqueter asset",
  notify_operator: "Notifier opérateur",
  log_event: "Journaliser",
  open_tactics_session: "Ouvrir session tactique",
  display_prompt: "Afficher invite",
};

/** Which action types are wired to a real engine API in this phase. */
export const ACTION_WIRED: Partial<Record<ActionType, boolean>> = {
  show_graphic: true,
  hide_graphic: true,
  queue_replay: true,
  create_media_collection: true,
  tag_media_asset: true,
  log_event: true,
  notify_operator: true,
};

export const APPROVAL_LABEL: Record<ApprovalMode, string> = {
  automatic: "Automatique",
  ask_operator: "Demander à l'opérateur",
  disabled: "Désactivé",
};

export const STATUS_DOT: Record<ExecutionStatus, string> = {
  pending_approval: "status__dot--warn",
  running: "status__dot--info",
  completed: "status__dot--ok",
  failed: "status__dot--offline",
  cancelled: "status__dot--idle",
  rejected: "status__dot--offline",
};

export const STATUS_LABEL: Record<ExecutionStatus, string> = {
  pending_approval: "En attente d'approbation",
  running: "En cours",
  completed: "Terminé",
  failed: "Échec",
  cancelled: "Annulé",
  rejected: "Rejeté",
};

export type WorkflowStep = {
  id: string;
  position: number;
  kind: NodeKind;
  ref: string | null;
  params: Record<string, any>;
};

export type Workflow = {
  id: string;
  name: string;
  description: string | null;
  template: string;
  enabled: boolean;
  approvalMode: ApprovalMode;
  triggerType: TriggerType;
  steps: WorkflowStep[];
};

export type Execution = {
  id: string;
  workflowId: string;
  status: ExecutionStatus;
  triggerType: string | null;
  operatorLabel: string | null;
  durationMs: number | null;
  error: string | null;
  createdAt: string;
};

// --- Built-in templates -----------------------------------------------------

export type TemplateDef = {
  key: string;
  name: string;
  triggerType: TriggerType;
  approvalMode: ApprovalMode;
  steps: { kind: NodeKind; ref?: string; params?: Record<string, any> }[];
};

export const TEMPLATES: TemplateDef[] = [
  {
    key: "goal",
    name: "Workflow But",
    triggerType: "match_event",
    approvalMode: "ask_operator",
    steps: [
      { kind: "delay", params: { ms: 2000 } },
      { kind: "action", ref: "show_graphic", params: { graphic: "event", eventType: "goal" } },
      { kind: "action", ref: "queue_replay", params: {} },
      { kind: "delay", params: { ms: 8000 } },
      { kind: "action", ref: "hide_graphic", params: { slot: "event" } },
      { kind: "end" },
    ],
  },
  {
    key: "halftime",
    name: "Workflow Mi-temps",
    triggerType: "match_status_changed",
    approvalMode: "ask_operator",
    steps: [
      { kind: "action", ref: "show_graphic", params: { graphic: "event", eventType: "halftime" } },
      { kind: "action", ref: "create_media_collection", params: { name: "Résumé mi-temps", kind: "halftime_highlights" } },
      { kind: "end" },
    ],
  },
  {
    key: "fulltime",
    name: "Workflow Fin de match",
    triggerType: "match_status_changed",
    approvalMode: "ask_operator",
    steps: [
      { kind: "action", ref: "show_graphic", params: { graphic: "event", eventType: "fulltime" } },
      { kind: "action", ref: "create_media_collection", params: { name: "Résumé fin de match", kind: "fulltime_highlights" } },
      { kind: "end" },
    ],
  },
  {
    key: "replay_ready",
    name: "Replay prêt",
    triggerType: "replay_ready",
    approvalMode: "automatic",
    steps: [
      { kind: "action", ref: "queue_replay", params: {} },
      { kind: "action", ref: "notify_operator", params: { message: "Replay prêt à diffuser" } },
      { kind: "end" },
    ],
  },
  {
    key: "var_review",
    name: "Revue VAR",
    triggerType: "match_event",
    approvalMode: "ask_operator",
    steps: [
      { kind: "action", ref: "show_graphic", params: { graphic: "event", eventType: "var" } },
      { kind: "action", ref: "queue_replay", params: {} },
      { kind: "end" },
    ],
  },
  {
    key: "breaking_news",
    name: "Breaking News",
    triggerType: "manual",
    approvalMode: "ask_operator",
    steps: [
      { kind: "action", ref: "display_prompt", params: { message: "Breaking News" } },
      { kind: "action", ref: "log_event", params: { message: "Breaking news déclenché" } },
      { kind: "end" },
    ],
  },
  {
    key: "studio_analysis",
    name: "Analyse studio",
    triggerType: "manual",
    approvalMode: "ask_operator",
    steps: [
      { kind: "action", ref: "open_tactics_session", params: {} },
      { kind: "action", ref: "notify_operator", params: { message: "Session tactique prête" } },
      { kind: "end" },
    ],
  },
  {
    key: "custom",
    name: "Personnalisé",
    triggerType: "manual",
    approvalMode: "ask_operator",
    steps: [{ kind: "end" }],
  },
];
