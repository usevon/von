import type { NextConfig } from "next";
import "./src/env";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@usevon/ui", "@usevon/react", "@usevon/auth"],
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: "inline",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "3h7lcrx4kj.ufs.sh",
        pathname: "/f/**",
      },
    ],
  },
  reactCompiler: true,
  devIndicators: false,
  experimental: {
    turbopackFileSystemCacheForDev: true,
  },
};

export default nextConfig;
