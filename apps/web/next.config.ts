import type { NextConfig } from "next";

/**
 * Next.js 16 config — PLACEHOLDER (foundation only).
 *
 * `transpilePackages` lets the app consume the workspace packages directly from
 * their TypeScript sources without a separate build step.
 */
const nextConfig: NextConfig = {
  // NOTE: this app now uses SSR + middleware for Supabase auth, so it can no
  // longer be a static export (`output: "export"` was removed in M1).
  // Deploying on Vercel therefore requires the project's Root Directory to be
  // set to `apps/web` (and the repo-root static-export vercel.json removed).
  reactStrictMode: true,
  transpilePackages: ["@teranga/ui", "@teranga/core", "@teranga/obs", "@teranga/types"],
};

export default nextConfig;
