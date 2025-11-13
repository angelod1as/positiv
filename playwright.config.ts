import { defineConfig, devices } from "@playwright/test"

import dotenv from "dotenv"
import path from "path"

dotenv.config({ path: path.resolve(import.meta.dirname, ".env") })

/**
 * See https://playwright.dev/docs/test-configuration.
 * 
 * E2E tests now run against production build using a custom server
 * that handles the Vercel preset build structure.
 */
export default defineConfig({
  testDir: "./e2e",
  /* No parallel execution - reliability first */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Limited retries for better stability */
  retries: 1,
  /* Stop after first failure */
  maxFailures: 1,
  /* Single worker - no parallel execution */
  workers: 1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  /* Test timeout */
  timeout: 60000, // 60 seconds
  /* Global setup/teardown */
  globalSetup: "./e2e/global-setup",
  globalTeardown: "./e2e/global-teardown",
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
      testMatch: '**/tests/auth/setup.ts'
    },
    
    // Unauthenticated tests
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testMatch: '**/tests/unauthenticated/*.spec.ts',
      dependencies: ['setup'],
    },
    
    // Auth tests (login, registration, etc.)
    {
      name: "chromium-auth",
      use: { ...devices["Desktop Chrome"] },
      testMatch: '**/tests/auth/*.spec.ts',
      testIgnore: '**/tests/auth/setup.ts',
    },
    
    // Authenticated user tests
    {
      name: 'chromium-authenticated-user',
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.resolve(import.meta.dirname, 'e2e/.auth/user.json'),
      },
      testMatch: '**/tests/authenticated/user-*.spec.ts',
      dependencies: ['setup'],
    },
    
    // Authenticated admin tests
    {
      name: 'chromium-authenticated-admin',
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.resolve(import.meta.dirname, 'e2e/.auth/admin.json'),
      },
      testMatch: '**/tests/authenticated/admin-*.spec.ts',
      dependencies: ['setup'],
    },
  ],
})