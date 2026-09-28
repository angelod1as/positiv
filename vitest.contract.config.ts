import { resolve } from "path"
import tsconfigPaths from "vite-tsconfig-paths"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    name: "contract",
    environment: "node",
    include: ["app/**/*.contract.test.ts"],
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      "~": resolve(__dirname, "./app"),
    },
  },
})
