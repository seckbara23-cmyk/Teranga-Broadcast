"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function MatchTabs({ matchId }: { matchId: string }) {
  const pathname = usePathname();
  const base = `/matches/${matchId}`;
  const tabs = [
    { href: base, label: "Console", exact: true },
    { href: `${base}/timeline`, label: "Chronologie", exact: false },
    { href: `${base}/replay`, label: "Replay", exact: false },
    { href: `${base}/graphics`, label: "Graphismes", exact: false },
    { href: `${base}/tactics`, label: "Tactique", exact: false },
  ];
  const disabled: string[] = [];

  return (
    <div className="tabs">
      {tabs.map((t) => {
        const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`tab ${active ? "tab--active" : ""}`}
          >
            {t.label}
          </Link>
        );
      })}
      {disabled.map((d) => (
        <span key={d} className="tab tab--disabled" title={`${d} — à venir`}>
          {d}
        </span>
      ))}
    </div>
  );
}
