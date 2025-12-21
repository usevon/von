import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: "esm",
  dts: true,
  sourcemap: true,
  clean: true,
  outDir: "dist",
  shims: true,
  alias: {
    "@": "./src",
  },
});
