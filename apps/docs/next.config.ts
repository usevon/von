import createMDX from "@next/mdx";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
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
  turbopack: {
    resolveExtensions: [".mdx", ".tsx", ".ts", ".jsx", ".js", ".mjs", ".json"],
  },
  rewrites() {
    return [
      // Rewrite .md URLs to LLM routes
      { source: "/index.md", destination: "/llms/index" },
      { source: "/:path*.md", destination: "/llms/:path*" },
    ];
  },
};

const withMDX = createMDX({
  options: {
    remarkPlugins: ["remark-gfm", "remark-sugar-high"],
    rehypePlugins: ["rehype-slug"],
  },
});

export default withMDX(nextConfig);
