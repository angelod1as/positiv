import type { FullConfig } from "@playwright/test"
import { deleteAllTestUsers } from "./utils/user-management"
import { cleanupTestEvents } from "./utils/db-cleanup"

async function globalTeardown(_config: FullConfig) {
  console.info("🧹 Running global teardown for E2E tests...")

  // Stop the production server if it's running
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serverRunning = (global as any).__PRODUCTION_SERVER_RUNNING__
  
  if (serverRunning) {
    console.info("🛑 Stopping production server...")
    
    try {
      const { stopProductionServer } = await import("./serve-production")
      await stopProductionServer()
      console.info("✅ Production server stopped")
    } catch (error) {
      console.error("⚠️ Error stopping production server:", error)
      // Don't fail teardown if server stop fails
    }
  }

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