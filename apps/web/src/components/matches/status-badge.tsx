import type { MatchStatus } from "@/features/matches/queries";

const MAP: Record<MatchStatus, { label: string; dot: string }> = {
  scheduled: { label: "Programmé", dot: "status__dot--idle" },
  live: { label: "Direct", dot: "status__dot--live" },
  halftime: { label: "Mi-temps", dot: "status__dot--warn" },
  finished: { label: "Terminé", dot: "status__dot--ok" },
  archived: { label: "Archivé", dot: "status__dot--idle" },
};

export function StatusBadge({ status }: { status: MatchStatus }) {
  const m = MAP[status] ?? MAP.scheduled;
  return (
    <span className="status">
      <span className={`status__dot ${m.dot}`} />
      {m.label}
    </span>
  );
}
