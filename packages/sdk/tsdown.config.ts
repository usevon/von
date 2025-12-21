import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: "esm",
  dts: {
    resolve: ["@usevon/api"],
  },
  sourcemap: true,
  clean: true,
  outDir: "dist",
  noExternal: ["@usevon/utils", "@usevon/api"],
});
