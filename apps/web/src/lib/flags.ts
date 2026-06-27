/**
 * Best-effort country-name → flag emoji for the scoreboard. Falls back to null
 * (the UI shows an initials chip). Not exhaustive — broadcast metadata (proper
 * team/flag data) is a future Graphics Engine concern.
 */
const FLAGS: Record<string, string> = {
  senegal: "🇸🇳",
  england: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  france: "🇫🇷",
  brazil: "🇧🇷",
  argentina: "🇦🇷",
  spain: "🇪🇸",
  germany: "🇩🇪",
  portugal: "🇵🇹",
  morocco: "🇲🇦",
  "côte d'ivoire": "🇨🇮",
  "cote d'ivoire": "🇨🇮",
  "ivory coast": "🇨🇮",
  cameroon: "🇨🇲",
  cameroun: "🇨🇲",
  ghana: "🇬🇭",
  nigeria: "🇳🇬",
  egypt: "🇪🇬",
  "south africa": "🇿🇦",
  mali: "🇲🇱",
  algeria: "🇩🇿",
  tunisia: "🇹🇳",
};

export function teamFlag(name: string | null | undefined): string | null {
  if (!name) return null;
  return FLAGS[name.trim().toLowerCase()] ?? null;
}

export function teamInitials(name: string | null | undefined): string {
  if (!name) return "—";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 3).toUpperCase();
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
}
