import { defineConfig, devices } from "@playwright/test"

import dotenv from "dotenv"
import path from "path"

dotenv.config({ path: path.resolve(import.meta.dirname, "..", ".env") })

/**
 * See https://playwright.dev/docs/test-configuration.
 * 
 * Note: Currently using dev server for E2E tests. Production build testing
 * requires custom server setup due to Vercel preset in react-router.config.ts
 * which creates a different build structure than expected by react-router-serve.
 * This is still effective for testing app functionality.
 */
export default defineConfig({
  testDir: "./tests",
  /* No parallel execution - reliability first */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Limited retries for better stability */
  retries: 1,
  /* Single worker - no parallel execution */
  workers: 1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: "list",
  /* Test timeout */
  timeout: 60000, // 60 seconds
  /* Global setup/teardown */
  globalSetup: "./global-setup",
  globalTeardown: "./global-teardown",
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: "http://localhost:5173",

    /* Timeouts for reliability */
    actionTimeout: 30000, // 30s for actions
    navigationTimeout: 60000, // 60s for navigation

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",

    /* Save info on failure */
    video: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  /* Configure projects for major browsers */
  projects: [
    // Setup project runs first to generate auth states
    { 
      name: 'setup', 
      testMatch: '**/auth/setup.ts'
    },
    
    // Default project without authentication
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ['setup'],
    },
    
    {
      name: 'chromium-authenticated-user',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e-new/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    
    // Authenticated admin project
    {
      name: 'chromium-authenticated-admin',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e-new/.auth/admin.json',
      },
      dependencies: ['setup'],
    },
  ],

  /* Run dev server for testing - production build testing requires custom server setup */
  webServer: {
    command: "pnpm dev",
    port: 5173,
    reuseExistingServer: !process.env.CI,
    timeout: 120000, // 2 minutes to start
  },
})