import createMDX from "@next/mdx";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
  transpilePackages: ["@usevon/ui"],
  reactCompiler: true,
  devIndicators: false,
  turbopack: {
    resolveExtensions: [".mdx", ".tsx", ".ts", ".jsx", ".js", ".mjs", ".json"],
  },
  async rewrites() {
    return [
      // Rewrite .md URLs to LLM routes
      { source: "/index.md", destination: "/llms/index" },
      { source: "/:path*.md", destination: "/llms/:path*" },
    ];
  },
};

const withMDX = createMDX({
  options: {
    remarkPlugins: ["remark-gfm"],
    rehypePlugins: [
      "rehype-slug",
      ["rehype-pretty-code", { theme: { dark: "github-dark", light: "github-light-default" }, keepBackground: false }],
    ],
  },
});

export default withMDX(nextConfig);
