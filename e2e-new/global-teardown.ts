import type { FullConfig } from "@playwright/test"
import { deleteAllTestUsers } from "./utils/user-management"
import { cleanupTestEvents } from "./utils/db-cleanup"

async function globalTeardown(_config: FullConfig) {
  console.info("🧹 Running global teardown for E2E tests...")

  try {
    // Delete all test events first (before users, due to foreign key constraints)
    await cleanupTestEvents()
    console.info("✅ Test events cleaned up successfully")
    
    // Delete all test users created during the test run
    await deleteAllTestUsers()
    console.info("✅ Test users cleaned up successfully")
  } catch (error) {
    console.error("⚠️ Error during test cleanup:", error)
    // Don't fail the test run if cleanup fails
  }

  console.info("✅ Global teardown completed")
}

export default globalTeardown