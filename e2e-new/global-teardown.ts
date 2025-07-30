import type { FullConfig } from "@playwright/test"

async function globalTeardown(_config: FullConfig) {
  console.info("🧹 Running global teardown for E2E tests...")

  // Cleanup tasks can be added here
  // For example: clearing test data, stopping services, etc.

  console.info("✅ Global teardown completed")
}

export default globalTeardown