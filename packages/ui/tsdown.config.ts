import { defineConfig, reactConfig } from '@von/typescript-config/tsdown'

export default defineConfig({
  ...reactConfig,
  entry: ['src/index.ts'],
  outDir: 'dist',
})
