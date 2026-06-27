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
  { href: "/health", label: "Santé système", kbd: "g s" },
];

// Future engines plug in here. Shown (disabled) so the operating environment
// makes the platform's shape visible — but Replay/Graphics/Tactics are NOT built.
const ENGINES: Item[] = [
  { href: "#", label: "Replay", disabled: true, hint: "à venir" },
  { href: "#", label: "Graphismes", disabled: true, hint: "à venir" },
  { href: "#", label: "Tactique", disabled: true, hint: "à venir" },
  { href: "#", label: "Média", disabled: true, hint: "à venir" },
  { href: "#", label: "Automatisation", disabled: true, hint: "à venir" },
  { href: "#", label: "IA", disabled: true, hint: "à venir" },
];

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
    </nav>
  );
}
