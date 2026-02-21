import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: "esm",
  failOnWarn: false,
  dts: true,
  sourcemap: false,
  clean: true,
  outDir: "dist",
  checks: { pluginTimings: false },
});
