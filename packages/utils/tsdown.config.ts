import { defineConfig } from "tsdown";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/crypto.ts",
    "src/errors.ts",
    "src/circuit-breaker.ts",
    "src/ids.ts",
    "src/transforms.ts",
    "src/logger.ts",
  ],
  format: "esm",
  dts: true,
  sourcemap: true,
  clean: true,
  outDir: "dist",
});
