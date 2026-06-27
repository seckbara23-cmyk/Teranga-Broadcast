/**
 * Placeholder landing page.
 *
 * This exists only so the Next.js app builds and deploys. The real operator
 * console (replay, graphics, events, assets) and OBS overlay routes are NOT
 * implemented yet — see docs/04-folder-structure.md and docs/09-roadmap.md.
 */
export default function Home() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "2rem",
        gap: "0.75rem",
      }}
    >
      <span
        style={{
          fontSize: "0.75rem",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "#1f9d55",
        }}
      >
        Teranga Broadcast
      </span>
      <h1 style={{ fontSize: "2rem", margin: 0 }}>
        Plateforme de production sportive
      </h1>
      <p style={{ maxWidth: "32rem", color: "#a1a1aa", margin: 0 }}>
        Foundation deployed successfully. The operator console and broadcast
        modules are under construction.
      </p>
    </main>
  );
}
