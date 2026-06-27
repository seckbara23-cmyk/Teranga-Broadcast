import type { NextConfig } from "next";

/**
 * Next.js 16 config — PLACEHOLDER (foundation only).
 *
 * `transpilePackages` lets the app consume the workspace packages directly from
 * their TypeScript sources without a separate build step.
 */
const nextConfig: NextConfig = {
  // Static HTML export (apps/web/out). Lets Vercel serve the app as static files
  // while the project Root Directory stays at the monorepo root. The foundation
  // page is fully static; revisit when SSR/API routes land (set Root Directory
  // to apps/web and drop `output: "export"`).
  output: "export",
  reactStrictMode: true,
  transpilePackages: ["@teranga/ui", "@teranga/core", "@teranga/obs", "@teranga/types"],
};

export default nextConfig;
