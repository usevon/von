import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@usevon/ui"],
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
  turbopack: {
    root: path.join(__dirname, "../.."),
  },
};

export default nextConfig;
