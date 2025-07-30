import { kysely } from "~/kysely"
import type { Kysely } from "kysely"
import type { Database } from "~/types/database/kysely.types"
import { TestDataTracker, cleanupTestData } from "./db-test-utils"

// Export the test Kysely instance
export function getTestKysely(): Kysely<Database> {
  return kysely
}

// Setup function for integration tests
export function setupIntegrationTest(): {
  tracker: TestDataTracker
  kysely: Kysely<Database>
} {
  // Ensure we're in test environment
  if (process.env.NODE_ENV !== "test") {
    throw new Error("Integration tests can only run in test environment")
  }

  const tracker = new TestDataTracker()
  const testKysely = getTestKysely()
  
  return {
    tracker,
    kysely: testKysely
  }
}

// Cleanup function to be used in afterEach hooks
export async function cleanupAfterTest(
  tracker: TestDataTracker,
  kysely: Kysely<Database>
): Promise<void> {
  await cleanupTestData(tracker, kysely)
}

// Helper to create test user in auth system
export async function createTestAuthUser(
  email: string,
  password: string = "test1234"
): Promise<{ id: string; email: string }> {
  // This would need to use Supabase Admin API
  // For now, we'll use existing test users from seeds
  // In a real implementation, we'd use createSupabaseTestClient like E2E tests
  return {
    id: `test-user-${Date.now()}`,
    email
  }
}

// Vitest setup hook for integration tests
export function setupIntegrationTestHooks() {
  const testContext = setupIntegrationTest()
  
  return {
    beforeEach: () => {
      // Reset tracker for each test
      testContext.tracker.clear()
    },
    afterEach: async () => {
      // Cleanup after each test
      await cleanupAfterTest(testContext.tracker, testContext.kysely)
    },
    getContext: () => testContext
  }
}