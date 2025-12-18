import { defineConfig, reactConfig } from "@usevon/typescript-config/tsdown";

export default defineConfig({
  ...reactConfig,
  entry: ["src/index.ts"],
  outDir: "dist",
});
