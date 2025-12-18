import type { UserConfig } from "tsdown";

export { defineConfig } from "tsdown";

export const baseConfig: UserConfig = {
  format: "esm",
  dts: true,
  sourcemap: true,
  clean: true,
};

export const reactConfig: UserConfig = {
  ...baseConfig,
};
