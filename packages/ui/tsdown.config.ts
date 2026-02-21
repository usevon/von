import { defineConfig } from "tsdown";

export default defineConfig([
  {
    entry: ["src/index.ts"],
    format: "esm",
    dts: true,
    sourcemap: true,
    clean: true,
    outDir: "dist",
    checks: { pluginTimings: false },
    banner: {
      js: '"use client";',
    },
  },
  {
    entry: ["src/lib/utils.ts"],
    format: "esm",
    dts: true,
    sourcemap: true,
    outDir: "dist",
    checks: { pluginTimings: false },
  },
]);
