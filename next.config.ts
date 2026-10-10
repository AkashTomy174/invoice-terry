import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Cache Components (+ the partial prefetching it enables) is an
  // experimental, still-evolving caching model. It already caused one
  // production outage here (GET /api/auth/me got permanently baked in at
  // build time, breaking login - see src/app/api/auth/me/route.ts) and is
  // suspected of still being behind a stale-forever /api/health response in
  // production. Nothing in this app relies on it (no `use cache`,
  // cacheLife/cacheTag directives, or PPR-dependent Suspense boundaries
  // anywhere in src/), and every page here reads live, per-request data -
  // so there's no upside to the risk. Turned off for a predictable,
  // conventional Next.js caching model instead.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
