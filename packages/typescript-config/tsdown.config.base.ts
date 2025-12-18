import { defineConfig, type UserConfig } from "tsdown";

export const baseConfig: UserConfig = {
  format: "esm",
  dts: true,
  sourcemap: true,
  clean: true,
};

export const reactConfig: UserConfig = {
  ...baseConfig,
};

export { defineConfig };
