import { defineConfig, reactConfig } from "@usevon/typescript-config/tsdown";

export default defineConfig({
  ...reactConfig,
  entry: ["src/index.ts", "src/hooks/index.ts"],
  outDir: "dist",
});
