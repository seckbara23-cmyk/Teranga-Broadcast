import type { ReactNode } from "react";

export const metadata = {
  title: "Teranga Broadcast",
  description:
    "Enterprise sports broadcast platform for TV stations and production teams.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          fontFamily:
            "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
          background: "#0a0a0b",
          color: "#fafafa",
        }}
      >
        {children}
      </body>
    </html>
  );
}
