import { baseConfig, defineConfig } from "@usevon/typescript-config/tsdown";

export default defineConfig({
  ...baseConfig,
  entry: ["src/index.ts"],
  outDir: "dist",
  noExternal: ["@usevon/utils", "@usevon/api"],
  dts: {
    resolve: ["@usevon/api"],
  },
});
