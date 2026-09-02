import { Kysely, PostgresDialect } from "kysely"
import { Pool } from "pg"
import { afterAll } from "vitest"
import { kyselyDb } from "~/kysely-db"
import type { Database } from "~/types/database/kysely.types"
import { assertLocalDatabaseUrl } from "./assert-local-database"
import { TestDataTracker, cleanupTestData } from "./db-test-utils"

// Create a test-specific Kysely instance
let testKysely: Kysely<Database> | null = null

/**
 * Every test file gets its own module registry, so each one builds its own
 * `pg` pool for the test client and another for the application's `kyselyDb`.
 * The suite runs in a single fork, so those pools all outlive their file and
 * their idle connections pile up until Postgres refuses new ones — the whole
 * suite starts failing on "remaining connection slots are reserved".
 *
 * Closing both at the end of the file keeps one file's worth of connections
 * open at a time, however many files the suite grows to.
 */
afterAll(async () => {
  const closing = testKysely
  testKysely = null
  await Promise.all([closing?.destroy(), kyselyDb.destroy()])
})

// Export the test Kysely instance
export function getTestKysely(): Kysely<Database> {
  if (!testKysely) {
    const connectionString = assertLocalDatabaseUrl(
      process.env.SUPABASE_CONNECT_URL,
    )

    testKysely = new Kysely<Database>({
      dialect: new PostgresDialect({
        pool: new Pool({
          connectionString,
        }),
      }),
    })
  }
  return testKysely
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

// Note: For creating test auth users, use createTestAuthUser from db-test-utils.ts
// which uses the Supabase Admin API to create real auth users.

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