/**
 * Replay transport — DESIGN ONLY. Disabled until the Replay Agent exists
 * (anticipates OBS Replay Buffer, vMix, Blackmagic HyperDeck, EVS, NDI, FFmpeg).
 */
const CONTROLS = [
  { icon: "◀", label: "Précédent" },
  { icon: "▶", label: "Lecture" },
  { icon: "⏸", label: "Pause" },
  { icon: "↺", label: "Replay" },
  { icon: "⏩", label: "Avance" },
  { icon: "⦿", label: "Mark" },
  { icon: "≣", label: "File" },
  { icon: "⬇", label: "Export" },
];

export function ReplayTransport() {
  return (
    <div className="transport">
      {CONTROLS.map((c) => (
        <button
          key={c.label}
          className="transport__btn"
          disabled
          title={`${c.label} — agent replay requis`}
        >
          <span className="transport__icon">{c.icon}</span>
          <span className="transport__label">{c.label}</span>
        </button>
      ))}
    </div>
  );
}
