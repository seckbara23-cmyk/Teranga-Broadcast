/** Teranga Tactics Engine — domain types. Annotations are SEMANTIC vector
 *  objects (geometry + style + football meaning), AI-extensible. */

export type Point = { x: number; y: number }; // normalized 0..1 over the canvas

export type LayerKind =
  | "players"
  | "ball"
  | "arrows"
  | "passing_lanes"
  | "pressing"
  | "defensive_shape"
  | "attacking_shape"
  | "measurements"
  | "notes"
  | "custom";

/** Drawing tools (toolbar). A subset is interactive in the foundation canvas;
 *  all are representable so the engine and AI can target them. */
export type ToolId =
  | "select"
  | "arrow"
  | "curved_arrow"
  | "freehand"
  | "line"
  | "rectangle"
  | "circle"
  | "ellipse"
  | "highlight"
  | "spotlight"
  | "player_halo"
  | "player_number"
  | "ball_marker"
  | "distance"
  | "angle"
  | "text"
  | "formation_grid"
  // tactical concept objects
  | "player_marker"
  | "goalkeeper"
  | "ball"
  | "passing_lane"
  | "running_lane"
  | "press_trigger"
  | "defensive_line"
  | "offside_line"
  | "block_shape"
  | "compactness_zone"
  | "width"
  | "depth"
  | "half_space"
  | "zone14"
  | "final_third"
  | "penalty_area"
  | "custom_shape";

/** Annotation kind == ToolId (minus 'select'). */
export type AnnotationKind = Exclude<ToolId, "select">;

export type AnnotationStyle = {
  color?: string;
  stroke?: number;
  fill?: string;
  opacity?: number;
  dashed?: boolean;
};

export type AnnotationSemantic = {
  team?: "home" | "away" | null;
  playerNumber?: number | null;
  role?: string | null;
  concept?: string | null; // e.g. "press_trigger", "half_space"
  label?: string | null;
};

export type TacticalAnnotation = {
  id: string;
  layerId: string;
  kind: AnnotationKind;
  geometry: { points: Point[]; text?: string };
  style: AnnotationStyle;
  semantic: AnnotationSemantic;
  zOrder: number;
};

export type TacticalLayer = {
  id: string;
  name: string;
  kind: LayerKind;
  visible: boolean;
  locked: boolean;
  zOrder: number;
};

export type TacticalSession = {
  id: string;
  matchId: string | null;
  clipId: string | null;
  title: string;
  freezeFrameUrl: string | null;
  clockLabel: string | null;
  homeColor: string;
  awayColor: string;
  status: "draft" | "active" | "archived";
  createdAt: string;
};

/** Tools shown in the foundation toolbar that draw real vector objects. */
export const TOOLBAR: { id: ToolId; label: string; icon: string }[] = [
  { id: "select", label: "Sélection", icon: "↖" },
  { id: "arrow", label: "Flèche", icon: "↗" },
  { id: "line", label: "Ligne", icon: "／" },
  { id: "freehand", label: "Libre", icon: "✎" },
  { id: "rectangle", label: "Rectangle", icon: "▭" },
  { id: "ellipse", label: "Ellipse", icon: "◯" },
  { id: "highlight", label: "Zone", icon: "▦" },
  { id: "player_marker", label: "Joueur", icon: "◉" },
  { id: "ball", label: "Ballon", icon: "⚽" },
  { id: "offside_line", label: "Hors-jeu", icon: "⊢" },
  { id: "text", label: "Texte", icon: "T" },
];

export type FormationName =
  | "4-4-2"
  | "4-3-3"
  | "4-2-3-1"
  | "3-5-2"
  | "3-4-3"
  | "5-4-1"
  | "5-3-2";

/** Formation templates as normalized player positions (attacking up the y-axis).
 *  x: 0 (left) → 1 (right); y: 0 (own goal) → 1 (opponent goal). */
export const FORMATIONS: Record<FormationName, Point[]> = {
  "4-4-2": rows([[0.5, 0.05]], [[0.2, 0.25], [0.4, 0.25], [0.6, 0.25], [0.8, 0.25]], [[0.2, 0.5], [0.4, 0.5], [0.6, 0.5], [0.8, 0.5]], [[0.4, 0.78], [0.6, 0.78]]),
  "4-3-3": rows([[0.5, 0.05]], [[0.2, 0.25], [0.4, 0.25], [0.6, 0.25], [0.8, 0.25]], [[0.3, 0.5], [0.5, 0.5], [0.7, 0.5]], [[0.2, 0.8], [0.5, 0.8], [0.8, 0.8]]),
  "4-2-3-1": rows([[0.5, 0.05]], [[0.2, 0.25], [0.4, 0.25], [0.6, 0.25], [0.8, 0.25]], [[0.4, 0.45], [0.6, 0.45]], [[0.25, 0.65], [0.5, 0.65], [0.75, 0.65]], [[0.5, 0.85]]),
  "3-5-2": rows([[0.5, 0.05]], [[0.3, 0.25], [0.5, 0.25], [0.7, 0.25]], [[0.15, 0.5], [0.35, 0.5], [0.5, 0.5], [0.65, 0.5], [0.85, 0.5]], [[0.4, 0.8], [0.6, 0.8]]),
  "3-4-3": rows([[0.5, 0.05]], [[0.3, 0.25], [0.5, 0.25], [0.7, 0.25]], [[0.2, 0.5], [0.4, 0.5], [0.6, 0.5], [0.8, 0.5]], [[0.2, 0.8], [0.5, 0.8], [0.8, 0.8]]),
  "5-4-1": rows([[0.5, 0.05]], [[0.12, 0.25], [0.3, 0.25], [0.5, 0.25], [0.7, 0.25], [0.88, 0.25]], [[0.2, 0.5], [0.4, 0.5], [0.6, 0.5], [0.8, 0.5]], [[0.5, 0.8]]),
  "5-3-2": rows([[0.5, 0.05]], [[0.12, 0.25], [0.3, 0.25], [0.5, 0.25], [0.7, 0.25], [0.88, 0.25]], [[0.3, 0.5], [0.5, 0.5], [0.7, 0.5]], [[0.4, 0.8], [0.6, 0.8]]),
};

function rows(...groups: number[][][]): Point[] {
  return groups.flat().map(([x, y]) => ({ x: x ?? 0.5, y: y ?? 0.5 }));
}

export const DEFAULT_COLORS = { home: "#1f9d55", away: "#38bdf8" };
