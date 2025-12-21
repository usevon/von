import { defineConfig } from "tsdown";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/crypto.ts",
    "src/errors.ts",
    "src/circuit-breaker.ts",
    "src/ids.ts",
    "src/transforms.ts",
    "src/env.ts",
    "src/logger.ts",
    "src/elysia.ts",
  ],
  format: "esm",
  dts: true,
  sourcemap: true,
  clean: true,
  outDir: "dist",
});
