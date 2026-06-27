"use client";

import { useEffect, useRef, useState } from "react";
import {
  createAnnotation,
  deleteAnnotation,
  updateAnnotation,
} from "@/features/tactics/actions";
import type {
  AnnotationKind,
  Point,
  TacticalAnnotation,
  TacticalLayer,
  ToolId,
} from "@/features/tactics/types";

const VW = 1000;
const VH = 562;
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

const POINT_TOOLS: AnnotationKind[] = ["player_marker", "ball"];

type Draft = { kind: AnnotationKind; points: Point[] };

export function TacticsCanvas({
  sessionId,
  matchId,
  freezeFrameUrl,
  layers,
  annotations,
  activeLayerId,
  tool,
  color,
  homeColor,
  awayColor,
  selectedId,
  onSelect,
  presentation,
}: {
  sessionId: string;
  matchId: string;
  freezeFrameUrl: string | null;
  layers: TacticalLayer[];
  annotations: TacticalAnnotation[];
  activeLayerId: string | null;
  tool: ToolId;
  color: string;
  homeColor: string;
  awayColor: string;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  presentation: boolean;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [optimistic, setOptimistic] = useState<TacticalAnnotation[]>([]);
  const dragRef = useRef<{ id: string; start: Point; base: Point[] } | null>(null);

  // Clear optimistic clips once the realtime list catches up.
  useEffect(() => {
    setOptimistic([]);
  }, [annotations]);

  const visibleLayerIds = new Set(layers.filter((l) => l.visible).map((l) => l.id));
  const lockedLayerIds = new Set(layers.filter((l) => l.locked).map((l) => l.id));
  const all = [...annotations, ...optimistic].filter((a) =>
    visibleLayerIds.has(a.layerId),
  );

  function toNorm(e: React.PointerEvent): Point {
    const r = svgRef.current!.getBoundingClientRect();
    return {
      x: clamp01((e.clientX - r.left) / r.width),
      y: clamp01((e.clientY - r.top) / r.height),
    };
  }

  async function persist(kind: AnnotationKind, points: Point[], team?: "home" | "away") {
    if (!activeLayerId) return;
    const semantic = team ? { team } : {};
    setOptimistic((o) => [
      ...o,
      { id: `tmp-${o.length}`, layerId: activeLayerId, kind, geometry: { points }, style: { color }, semantic, zOrder: 0 },
    ]);
    await createAnnotation({
      sessionId,
      layerId: activeLayerId,
      matchId,
      kind,
      geometry: { points },
      style: { color },
      semantic,
    });
  }

  function onPointerDown(e: React.PointerEvent) {
    if (presentation) return;
    const p = toNorm(e);

    if (tool === "select") return; // selection handled per-annotation

    if (POINT_TOOLS.includes(tool as AnnotationKind)) {
      void persist(tool as AnnotationKind, [p]);
      return;
    }
    if (tool === "text") {
      const text = window.prompt("Texte :");
      if (text && activeLayerId) {
        setOptimistic((o) => [...o, { id: `tmp-${o.length}`, layerId: activeLayerId, kind: "text", geometry: { points: [p], text }, style: { color }, semantic: {}, zOrder: 0 }]);
        void createAnnotation({ sessionId, layerId: activeLayerId, matchId, kind: "text", geometry: { points: [p], text }, style: { color } });
      }
      return;
    }
    if (tool === "offside_line") {
      void persist("offside_line", [{ x: 0, y: p.y }, { x: 1, y: p.y }]);
      return;
    }
    // two-point + freehand: start a draft
    setDraft({ kind: tool as AnnotationKind, points: [p, p] });
  }

  function onPointerMove(e: React.PointerEvent) {
    if (dragRef.current) {
      const p = toNorm(e);
      const d = dragRef.current;
      const dx = p.x - d.start.x;
      const dy = p.y - d.start.y;
      const moved = d.base.map((pt) => ({ x: clamp01(pt.x + dx), y: clamp01(pt.y + dy) }));
      setOptimistic([{ ...(annotations.find((a) => a.id === d.id) as TacticalAnnotation), geometry: { points: moved, text: annotations.find((a) => a.id === d.id)?.geometry.text } }]);
      return;
    }
    if (!draft) return;
    const p = toNorm(e);
    if (draft.kind === "freehand") {
      setDraft({ kind: "freehand", points: [...draft.points, p] });
    } else {
      setDraft({ kind: draft.kind, points: [draft.points[0]!, p] });
    }
  }

  async function onPointerUp() {
    if (dragRef.current) {
      const d = dragRef.current;
      const opt = optimistic[0];
      dragRef.current = null;
      if (opt) await updateAnnotation(d.id, { geometry: opt.geometry });
      return;
    }
    if (!draft) return;
    const pts = draft.points;
    const big =
      draft.kind === "freehand"
        ? pts.length > 2
        : Math.hypot(pts[1]!.x - pts[0]!.x, pts[1]!.y - pts[0]!.y) > 0.01;
    if (big) await persist(draft.kind, pts);
    setDraft(null);
  }

  function selectAnnotation(e: React.PointerEvent, a: TacticalAnnotation) {
    if (tool !== "select" || presentation) return;
    e.stopPropagation();
    onSelect(a.id);
    if (!lockedLayerIds.has(a.layerId)) {
      dragRef.current = { id: a.id, start: toNorm(e), base: a.geometry.points };
    }
  }

  // Delete key removes the selected annotation.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      if (el && ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) return;
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        void deleteAnnotation(selectedId);
        onSelect(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, onSelect]);

  return (
    <svg
      ref={svgRef}
      className="tac-canvas"
      viewBox={`0 0 ${VW} ${VH}`}
      preserveAspectRatio="xMidYMid meet"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={() => {
        if (draft) void onPointerUp();
      }}
      style={{ cursor: tool === "select" ? "default" : "crosshair" }}
    >
      <defs>
        <marker id="tac-arrow" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto">
          <path d="M0,0 L7,3 L0,6 Z" fill={color} />
        </marker>
      </defs>

      {freezeFrameUrl ? (
        <image href={freezeFrameUrl} x="0" y="0" width={VW} height={VH} preserveAspectRatio="xMidYMid slice" />
      ) : (
        <Pitch />
      )}

      {all.map((a) => (
        <AnnotationShape
          key={a.id}
          a={a}
          homeColor={homeColor}
          awayColor={awayColor}
          selected={a.id === selectedId}
          onPointerDown={(e) => selectAnnotation(e, a)}
        />
      ))}

      {draft ? (
        <AnnotationShape
          a={{ id: "draft", layerId: "", kind: draft.kind, geometry: { points: draft.points }, style: { color }, semantic: {}, zOrder: 0 }}
          homeColor={homeColor}
          awayColor={awayColor}
          selected={false}
        />
      ) : null}
    </svg>
  );
}

function Pitch() {
  return (
    <g>
      <rect x="0" y="0" width={VW} height={VH} fill="#0c5a2e" />
      <rect x="20" y="20" width={VW - 40} height={VH - 40} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
      <line x1={VW / 2} y1="20" x2={VW / 2} y2={VH - 20} stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
      <circle cx={VW / 2} cy={VH / 2} r="70" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
    </g>
  );
}

function AnnotationShape({
  a,
  homeColor,
  awayColor,
  selected,
  onPointerDown,
}: {
  a: TacticalAnnotation;
  homeColor: string;
  awayColor: string;
  selected: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
}) {
  const c = a.style.color ?? "#ffe600";
  const sw = (a.style.stroke ?? 3) as number;
  const pts = a.geometry.points.map((p) => ({ x: p.x * VW, y: p.y * VH }));
  const p0 = pts[0];
  const p1 = pts[1];
  const selProps = selected ? { filter: "drop-shadow(0 0 4px #fff)" } : {};
  const common = { onPointerDown, style: { cursor: "pointer" } as const };

  switch (a.kind) {
    case "arrow":
      if (!p0 || !p1) return null;
      return <line {...common} x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke={c} strokeWidth={sw} markerEnd="url(#tac-arrow)" {...selProps} />;
    case "line":
      if (!p0 || !p1) return null;
      return <line {...common} x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke={c} strokeWidth={sw} {...selProps} />;
    case "offside_line":
      if (!p0 || !p1) return null;
      return <line {...common} x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke={c} strokeWidth={sw} strokeDasharray="10 6" {...selProps} />;
    case "rectangle":
    case "highlight":
      if (!p0 || !p1) return null;
      return <rect {...common} x={Math.min(p0.x, p1.x)} y={Math.min(p0.y, p1.y)} width={Math.abs(p1.x - p0.x)} height={Math.abs(p1.y - p0.y)} fill={a.kind === "highlight" ? c : "none"} fillOpacity={a.kind === "highlight" ? 0.25 : 0} stroke={c} strokeWidth={sw} {...selProps} />;
    case "ellipse":
      if (!p0 || !p1) return null;
      return <ellipse {...common} cx={(p0.x + p1.x) / 2} cy={(p0.y + p1.y) / 2} rx={Math.abs(p1.x - p0.x) / 2} ry={Math.abs(p1.y - p0.y) / 2} fill="none" stroke={c} strokeWidth={sw} {...selProps} />;
    case "freehand":
      return <polyline {...common} points={pts.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke={c} strokeWidth={sw} {...selProps} />;
    case "text":
      if (!p0) return null;
      return <text {...common} x={p0.x} y={p0.y} fill={c} fontSize="26" fontWeight={700} {...selProps}>{a.geometry.text ?? ""}</text>;
    case "ball":
      if (!p0) return null;
      return <circle {...common} cx={p0.x} cy={p0.y} r="9" fill="#fff" stroke="#000" strokeWidth="2" {...selProps} />;
    case "player_marker":
    default: {
      if (!p0) return null;
      const team = a.semantic.team;
      const fill = team === "away" ? awayColor : team === "home" ? homeColor : c;
      return (
        <g {...common} {...selProps}>
          <circle cx={p0.x} cy={p0.y} r="16" fill={fill} stroke="#000" strokeWidth="2" />
          <text x={p0.x} y={p0.y + 6} fill="#fff" fontSize="18" fontWeight={800} textAnchor="middle">
            {a.semantic.playerNumber ?? ""}
          </text>
        </g>
      );
    }
  }
}
