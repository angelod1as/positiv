import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './app/test/setup.ts',
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        '**/*.test.*',
        '**/*.spec.*',
        '**/*.d.ts',
        '**/*.config.*',
        '**/__mocks__/**',
        'build/**',
        'app/test/setup.ts',
      ],
    },
    include: ['app/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}', 'scripts/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules/', '**/*.integration.test.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '~': resolve(__dirname, './app'),
    },
  },
})