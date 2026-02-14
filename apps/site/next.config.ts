import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@usevon/ui"],
  images: {
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
