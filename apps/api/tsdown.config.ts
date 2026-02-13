import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: "esm",
  failOnWarn: false,
  dts: true,
  sourcemap: true,
  clean: true,
  outDir: "dist",
});
