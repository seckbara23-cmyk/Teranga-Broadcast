import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Teranga Broadcast",
  description:
    "Enterprise sports broadcast platform for TV stations and production teams.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
