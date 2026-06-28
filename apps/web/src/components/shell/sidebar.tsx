"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = {
  href: string;
  label: string;
  kbd?: string;
  disabled?: boolean;
  hint?: string;
};

const PRIMARY: Item[] = [
  { href: "/matches", label: "Centre des matchs", kbd: "g m" },
  { href: "/ai", label: "Copilote IA", kbd: "g i" },
  { href: "/automation", label: "Automatisation", kbd: "g a" },
  { href: "/media", label: "Média", kbd: "g d" },
  { href: "/health", label: "Santé système", kbd: "g s" },
];

// Per-match engines (Replay/Graphics/Tactics) are reached inside a match.
const ENGINES: Item[] = [];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="nav" aria-label="Navigation principale">
      <div className="nav__section">Production</div>
      {PRIMARY.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.label}
            href={item.href}
            className={`nav-item ${active ? "nav-item--active" : ""}`}
          >
            {item.label}
            {item.kbd ? (
              <span className="kbd nav-item__kbd">{item.kbd}</span>
            ) : null}
          </Link>
        );
      })}

      {ENGINES.length > 0 ? (
        <>
          <div className="nav__section">Moteurs</div>
          {ENGINES.map((item) => (
            <span
              key={item.label}
              className="nav-item nav-item--disabled"
              title={`${item.label} — ${item.hint}`}
              aria-disabled="true"
            >
              {item.label}
              <span className="kbd nav-item__kbd">{item.hint}</span>
            </span>
          ))}
        </>
      ) : null}
    </nav>
  );
}
