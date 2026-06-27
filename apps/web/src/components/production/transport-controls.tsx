/**
 * Operator transport controls (professional replay-system style). Most controls
 * stay DISABLED until the Replay Engine and OBS Agent exist (Phases 3 & 7) —
 * designed now so the layout and muscle memory are established.
 */
const TRANSPORT = [
  { icon: "⏺", label: "Record", note: "Agent OBS requis" },
  { icon: "▶", label: "Live", note: "Agent OBS requis" },
  { icon: "⏸", label: "Pause", note: "Agent OBS requis" },
  { icon: "■", label: "Stop", note: "Agent OBS requis" },
  { icon: "◀", label: "Replay", note: "Replay Engine requis" },
  { icon: "⟳", label: "Buffer", note: "Replay Engine requis" },
  { icon: "📺", label: "On Air", note: "Agent OBS requis" },
];

export function TransportControls() {
  return (
    <div className="transport">
      {TRANSPORT.map((t) => (
        <button
          key={t.label}
          className="transport__btn"
          disabled
          title={`${t.label} — ${t.note}`}
        >
          <span className="transport__icon">{t.icon}</span>
          <span className="transport__label">{t.label}</span>
        </button>
      ))}
    </div>
  );
}
