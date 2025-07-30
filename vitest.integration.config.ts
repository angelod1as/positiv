import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    name: 'integration',
    environment: 'node', // Integration tests run in Node, not jsdom
    globals: true,
    setupFiles: './app/test/integration-setup.ts',
    include: ['app/**/*.integration.test.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    // Integration tests should run sequentially to avoid database conflicts
    pool: 'forks',
    poolOptions: {
      threads: {
        singleThread: true
      },
      forks: {
        singleFork: true
      }
    },
    // Longer timeout for database operations
    testTimeout: 30000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      '~': resolve(__dirname, './app'),
    },
  },
})