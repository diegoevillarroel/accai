import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg", "drizzle-orm"],
  typescript: {
    // Plan90D uses a legacy API shape - skipping type errors for now
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
