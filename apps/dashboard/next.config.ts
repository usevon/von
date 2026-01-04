import type { NextConfig } from "next";
import "./src/env";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@usevon/ui", "@usevon/react", "@usevon/auth"],
  reactCompiler: true,
  devIndicators: false,
  experimental: {
    turbopackFileSystemCacheForDev: true,
  },
};

export default nextConfig;
