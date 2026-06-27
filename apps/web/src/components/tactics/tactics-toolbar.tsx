"use client";

import { TOOLBAR, type ToolId } from "@/features/tactics/types";

const COLORS = ["#ffe600", "#ef4444", "#1f9d55", "#38bdf8", "#ffffff", "#f97316"];

export function TacticsToolbar({
  tool,
  setTool,
  color,
  setColor,
}: {
  tool: ToolId;
  setTool: (t: ToolId) => void;
  color: string;
  setColor: (c: string) => void;
}) {
  return (
    <div className="tac-toolbar">
      <div className="tac-tools">
        {TOOLBAR.map((t) => (
          <button
            key={t.id}
            className={`tac-tool ${tool === t.id ? "tac-tool--on" : ""}`}
            title={t.label}
            onClick={() => setTool(t.id)}
          >
            <span className="tac-tool__icon">{t.icon}</span>
          </button>
        ))}
      </div>
      <div className="tac-colors">
        {COLORS.map((c) => (
          <button
            key={c}
            className={`tac-color ${color === c ? "tac-color--on" : ""}`}
            style={{ background: c }}
            onClick={() => setColor(c)}
            title={c}
          />
        ))}
      </div>
    </div>
  );
}
