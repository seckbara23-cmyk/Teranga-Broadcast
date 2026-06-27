"use client";

import { useState } from "react";

/** Copies the absolute OBS overlay URL (origin + signed path) to the clipboard. */
export function CopyUrlButton({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    const url =
      typeof window !== "undefined" ? window.location.origin + path : path;
    void navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <button className="btn btn--primary" onClick={copy}>
      {copied ? "Copié ✓" : "Copier l'URL OBS"}
    </button>
  );
}
