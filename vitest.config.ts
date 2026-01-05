import react from "@vitejs/plugin-react"
import { resolve } from "path"
import tsconfigPaths from "vite-tsconfig-paths"
import { defineConfig } from "vitest/config"

// CI environments get unlimited workers (Vitest auto-detects CPU count)
// Local development gets limited workers to save memory (~8GB instead of 12GB+)
const isCI = process.env.CI === "true"
const defaultMaxForks = isCI ? undefined : 2
const defaultMinForks = isCI ? undefined : 1

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./app/test/setup.ts",
    pool: "forks",
    poolOptions: {
      forks: {
        minForks: process.env.VITEST_MIN_FORKS
          ? Number(process.env.VITEST_MIN_FORKS)
          : defaultMinForks,
        maxForks: process.env.VITEST_MAX_FORKS
          ? Number(process.env.VITEST_MAX_FORKS)
          : defaultMaxForks,
        isolate: true,
      },
    },
    coverage: {
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "**/*.test.*",
        "**/*.spec.*",
        "**/*.d.ts",
        "**/*.config.*",
        "**/__mocks__/**",
        "build/**",
        "app/test/setup.ts",
      ],
    },
    include: [
      "app/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
      "scripts/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
    ],
    exclude: ["node_modules/", "**/*.integration.test.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "~": resolve(__dirname, "./app"),
    },
  },
})
