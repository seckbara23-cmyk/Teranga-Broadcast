import type { NextConfig } from "next";

/**
 * Next.js 16 config — PLACEHOLDER (foundation only).
 *
 * `transpilePackages` lets the app consume the workspace packages directly from
 * their TypeScript sources without a separate build step.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@teranga/ui", "@teranga/core", "@teranga/obs", "@teranga/types"],
};

export default nextConfig;
