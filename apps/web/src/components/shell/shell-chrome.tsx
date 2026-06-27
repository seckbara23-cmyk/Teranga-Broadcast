"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type MatchRef = { id: string; title: string };

type Command = {
  id: string;
  label: string;
  hint?: string;
  run: () => void;
};

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    el.isContentEditable
  );
}

/**
 * Global keyboard chrome for the control room:
 *  - Cmd/Ctrl+K  command palette (fast navigation, minimal clicks)
 *  - ?           shortcuts help
 *  - g m / g h   nav chords
 * A single keydown listener avoids handler conflicts.
 */
export function ShellChrome({ matches }: { matches: MatchRef[] }) {
  const router = useRouter();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const chordRef = useRef<string | null>(null);
  const chordTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands = useMemo<Command[]>(() => {
    const base: Command[] = [
      {
        id: "nav-matches",
        label: "Centre des matchs",
        hint: "g m",
        run: () => router.push("/matches"),
      },
      {
        id: "new-match",
        label: "Nouveau match",
        hint: "c",
        run: () => router.push("/matches?new=1"),
      },
      {
        id: "nav-health",
        label: "Santé système",
        hint: "g s",
        run: () => router.push("/health"),
      },
      {
        id: "help",
        label: "Raccourcis clavier",
        hint: "?",
        run: () => setHelpOpen(true),
      },
    ];
    const matchCmds: Command[] = matches.map((m) => ({
      id: `match-${m.id}`,
      label: m.title,
      hint: "match",
      run: () => router.push(`/matches/${m.id}`),
    }));
    return [...base, ...matchCmds];
  }, [matches, router]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => c.label.toLowerCase().includes(q));
  }, [commands, query]);

  const closePalette = useCallback(() => {
    setPaletteOpen(false);
    setQuery("");
    setActive(0);
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Command palette toggle — always available.
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
        return;
      }
      if (e.key === "Escape") {
        setPaletteOpen(false);
        setHelpOpen(false);
        return;
      }

      if (isTyping(e.target)) return;

      if (e.key === "?") {
        e.preventDefault();
        setHelpOpen((v) => !v);
        return;
      }
      if (e.key.toLowerCase() === "c") {
        router.push("/matches?new=1");
        return;
      }

      // Nav chords: g then m/h
      if (chordRef.current === "g") {
        if (e.key.toLowerCase() === "m") router.push("/matches");
        if (e.key.toLowerCase() === "h") router.push("/");
        if (e.key.toLowerCase() === "s") router.push("/health");
        chordRef.current = null;
        return;
      }
      if (e.key.toLowerCase() === "g") {
        chordRef.current = "g";
        if (chordTimer.current) clearTimeout(chordTimer.current);
        chordTimer.current = setTimeout(() => (chordRef.current = null), 800);
      }
    }

    function onOpenPalette() {
      setPaletteOpen(true);
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("teranga:open-palette", onOpenPalette);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("teranga:open-palette", onOpenPalette);
    };
  }, [router]);

  useEffect(() => {
    if (paletteOpen) {
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [paletteOpen]);

  function onPaletteKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const cmd = filtered[active];
      if (cmd) {
        closePalette();
        cmd.run();
      }
    }
  }

  return (
    <>
      {paletteOpen ? (
        <div className="overlay" onClick={closePalette}>
          <div className="palette" onClick={(e) => e.stopPropagation()}>
            <input
              ref={inputRef}
              className="palette__input"
              placeholder="Aller à… (match, action)"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onPaletteKey}
            />
            <div style={{ maxHeight: "50vh", overflowY: "auto" }}>
              {filtered.length === 0 ? (
                <div className="palette__item dim">Aucun résultat</div>
              ) : (
                filtered.map((c, i) => (
                  <div
                    key={c.id}
                    className={`palette__item ${
                      i === active ? "palette__item--active" : ""
                    }`}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => {
                      closePalette();
                      c.run();
                    }}
                  >
                    {c.label}
                    {c.hint ? <small>{c.hint}</small> : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}

      {helpOpen ? (
        <div className="overlay" onClick={() => setHelpOpen(false)}>
          <div className="palette" onClick={(e) => e.stopPropagation()}>
            <div className="panel__header">
              <span className="panel__title">Raccourcis clavier</span>
              <span className="dim" style={{ fontSize: "0.75rem" }}>
                Échap pour fermer
              </span>
            </div>
            <div className="panel__body" style={{ display: "grid", gap: "0.6rem" }}>
              {[
                ["⌘ / Ctrl + K", "Palette de commandes"],
                ["g puis m", "Centre des matchs"],
                ["g puis h", "Accueil"],
                ["c", "Nouveau match"],
                ["?", "Cette aide"],
              ].map(([k, label]) => (
                <div key={k} className="row" style={{ justifyContent: "space-between" }}>
                  <span className="muted">{label}</span>
                  <span className="kbd">{k}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
