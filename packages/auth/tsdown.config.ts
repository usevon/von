import { defineConfig, baseConfig } from '@usevon/typescript-config/tsdown'

export default defineConfig({
  ...baseConfig,
  entry: ['src/index.ts', 'src/client.ts'],
  outDir: 'dist',
})
