import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { getTestKysely, setupIntegrationTest, cleanupAfterTest } from "./integration-setup"
import { TestDataTracker } from "./db-test-utils"

// Mock the kysely module
vi.mock("~/kysely", () => ({
  kysely: {
    connection: vi.fn().mockReturnThis(),
    dynamic: {},
    selectFrom: vi.fn().mockReturnThis(),
    insertInto: vi.fn().mockReturnThis(),
    deleteFrom: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    execute: vi.fn().mockResolvedValue(undefined)
  }
}))

describe("Integration Test Setup", () => {
  it("should provide a test Kysely instance", () => {
    const kysely = getTestKysely()
    expect(kysely).toBeDefined()
    expect(kysely).toHaveProperty("selectFrom")
  })

  it("should setup integration test with tracker", () => {
    const { tracker, kysely } = setupIntegrationTest()
    
    expect(tracker).toBeInstanceOf(TestDataTracker)
    expect(kysely).toBeDefined()
    expect(tracker.getTrackedData()).toHaveLength(0)
  })

  it("should cleanup tracked data after test", async () => {
    const tracker = new TestDataTracker()
    const mockKysely = {
      deleteFrom: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      execute: vi.fn().mockResolvedValue(undefined)
    }
    
    // Track some test data
    tracker.track("profiles", "test-profile-id")
    tracker.track("events", "test-event-id")
    
    await cleanupAfterTest(tracker, mockKysely as any)
    
    // Should have called cleanup
    expect(mockKysely.deleteFrom).toHaveBeenCalled()
    expect(tracker.getTrackedData()).toHaveLength(0)
  })
})

describe("Integration Test Hooks", () => {
  let originalEnv: string | undefined

  beforeEach(() => {
    originalEnv = process.env.NODE_ENV
  })

  afterEach(() => {
    process.env.NODE_ENV = originalEnv
  })

  it("should only run in test environment", () => {
    process.env.NODE_ENV = "production"
    
    expect(() => setupIntegrationTest()).toThrow("Integration tests can only run in test environment")
  })

  it("should work in test environment", () => {
    process.env.NODE_ENV = "test"
    
    expect(() => setupIntegrationTest()).not.toThrow()
  })
})