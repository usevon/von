import type { NextConfig } from "next";
import "./src/env";

const nextConfig: NextConfig = {
  transpilePackages: ["@usevon/ui", "@usevon/react", "@usevon/auth"],
};

export default nextConfig;
