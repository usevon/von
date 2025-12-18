import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  clean: true,
  shims: true,
  alias: {
    "@": "./src",
  },
  noExternal: ["@usevon/tunnel"],
});
