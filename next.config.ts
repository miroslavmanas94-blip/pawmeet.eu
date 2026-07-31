import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Ignorovat ESLint chyby během sestavování (build) */
  eslint: {
    ignoreDuringBuilds: true,
  },
  /* Ignorovat TypeScript chyby během sestavování */
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;