import { defineConfig, baseConfig } from "@usevon/typescript-config/tsdown"

export default defineConfig({
  ...baseConfig,
  entry: [
    "src/index.ts",
    "src/crypto.ts",
    "src/errors.ts",
    "src/circuit-breaker.ts",
    "src/ids.ts",
    "src/transforms.ts",
    "src/env.ts",
    "src/logger.ts",
    "src/fetch/index.ts",
    "src/elysia/error-handler.ts",
  ],
  outDir: "dist",
})
