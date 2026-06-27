"use client";

import { useTransition } from "react";
import { recordExport } from "@/features/tactics/actions";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportMenu({ sessionId }: { sessionId: string }) {
  const [pending, startTransition] = useTransition();

  function getSvg(): SVGSVGElement | null {
    return document.querySelector(".tac-canvas");
  }

  function exportSvg() {
    const svg = getSvg();
    if (!svg) return;
    const data = new XMLSerializer().serializeToString(svg);
    downloadBlob(new Blob([data], { type: "image/svg+xml" }), `analyse-${sessionId}.svg`);
    startTransition(() => recordExport(sessionId, "svg"));
  }

  function exportPng() {
    const svg = getSvg();
    if (!svg) return;
    const data = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1000;
      canvas.height = 562;
      const cx = canvas.getContext("2d");
      if (!cx) return;
      cx.drawImage(img, 0, 0, 1000, 562);
      try {
        canvas.toBlob((b) => {
          if (b) downloadBlob(b, `analyse-${sessionId}.png`);
        }, "image/png");
        startTransition(() => recordExport(sessionId, "png"));
      } catch {
        /* cross-origin freeze frame can taint the canvas; SVG export still works */
      }
    };
    img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(data)))}`;
  }

  return (
    <div className="row" style={{ gap: "0.4rem", flexWrap: "wrap" }}>
      <button className="btn" onClick={exportSvg}>SVG</button>
      <button className="btn" onClick={exportPng}>PNG</button>
      <button className="btn btn--ghost" disabled={pending} onClick={() => startTransition(() => recordExport(sessionId, "pdf"))}>PDF</button>
      <button className="btn btn--ghost" disabled={pending} onClick={() => startTransition(() => recordExport(sessionId, "presentation_package"))}>Package</button>
    </div>
  );
}
