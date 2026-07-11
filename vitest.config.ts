import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['tests/setup.ts'],
    testTimeout: 20000,
    hookTimeout: 60000,
  },
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
})
