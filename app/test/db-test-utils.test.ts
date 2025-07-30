import { describe, expect, it, vi } from "vitest"
import { TestDataTracker } from "./db-test-utils"

describe("TestDataTracker", () => {
  it("should track created entities", () => {
    const tracker = new TestDataTracker()
    
    tracker.track("profiles", "profile-id-1")
    tracker.track("events", "event-id-1")
    tracker.track("event_participants", "participant-id-1")
    
    const tracked = tracker.getTrackedData()
    expect(tracked).toHaveLength(3)
    expect(tracked[0]).toEqual({ table: "profiles", id: "profile-id-1" })
    expect(tracked[1]).toEqual({ table: "events", id: "event-id-1" })
    expect(tracked[2]).toEqual({ table: "event_participants", id: "participant-id-1" })
  })

  it("should return tracked data in reverse order for cleanup", () => {
    const tracker = new TestDataTracker()
    
    tracker.track("profiles", "profile-id-1")
    tracker.track("events", "event-id-1")
    tracker.track("event_participants", "participant-id-1")
    
    const forCleanup = tracker.getTrackedDataForCleanup()
    expect(forCleanup).toHaveLength(3)
    expect(forCleanup[0]).toEqual({ table: "event_participants", id: "participant-id-1" })
    expect(forCleanup[1]).toEqual({ table: "events", id: "event-id-1" })
    expect(forCleanup[2]).toEqual({ table: "profiles", id: "profile-id-1" })
  })

  it("should clear tracked data", () => {
    const tracker = new TestDataTracker()
    
    tracker.track("profiles", "profile-id-1")
    tracker.track("events", "event-id-1")
    
    expect(tracker.getTrackedData()).toHaveLength(2)
    
    tracker.clear()
    
    expect(tracker.getTrackedData()).toHaveLength(0)
  })

  it("should handle multiple IDs for the same table", () => {
    const tracker = new TestDataTracker()
    
    tracker.track("profiles", "profile-id-1")
    tracker.track("profiles", "profile-id-2")
    tracker.track("events", "event-id-1")
    
    const tracked = tracker.getTrackedData()
    expect(tracked).toHaveLength(3)
    expect(tracked.filter(item => item.table === "profiles")).toHaveLength(2)
  })
})

describe("cleanupTestData", () => {
  it("should delete tracked data from database in correct order", async () => {
    const { cleanupTestData, TestDataTracker } = await import("./db-test-utils")
    const tracker = new TestDataTracker()
    
    // Mock the database client
    const mockKysely = {
      deleteFrom: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      execute: vi.fn().mockResolvedValue(undefined)
    }
    
    tracker.track("profiles", "profile-id-1")
    tracker.track("events", "event-id-1")
    tracker.track("event_participants", "participant-id-1")
    
    await cleanupTestData(tracker, mockKysely as any)
    
    // Should delete in reverse order
    expect(mockKysely.deleteFrom).toHaveBeenCalledTimes(3)
    expect(mockKysely.deleteFrom).toHaveBeenNthCalledWith(1, "event_participants")
    expect(mockKysely.deleteFrom).toHaveBeenNthCalledWith(2, "events")
    expect(mockKysely.deleteFrom).toHaveBeenNthCalledWith(3, "profiles")
    
    // Should clear tracker after cleanup
    expect(tracker.getTrackedData()).toHaveLength(0)
  })

  it("should handle cleanup errors gracefully", async () => {
    const { cleanupTestData, TestDataTracker } = await import("./db-test-utils")
    const tracker = new TestDataTracker()
    
    const mockKysely = {
      deleteFrom: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      execute: vi.fn().mockRejectedValue(new Error("Delete failed"))
    }
    
    tracker.track("profiles", "profile-id-1")
    
    // Should not throw, but log error
    await expect(cleanupTestData(tracker, mockKysely as any)).resolves.not.toThrow()
  })
})

describe("Test data creation utilities", () => {
  it("should create a test profile and track it", async () => {
    const { createTestProfile, TestDataTracker } = await import("./db-test-utils")
    const tracker = new TestDataTracker()
    
    const mockKysely = {
      insertInto: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockReturnThis(),
      executeTakeFirstOrThrow: vi.fn().mockResolvedValue({
        id: "generated-profile-id",
        user_id: "test-user-id",
        email: "test@example.com",
        is_test_data: true
      })
    }
    
    const profile = await createTestProfile(tracker, mockKysely as any, {
      user_id: "test-user-id",
      email: "test@example.com"
    })
    
    expect(profile.id).toBe("generated-profile-id")
    expect(profile.is_test_data).toBe(true)
    
    // Should track the created profile
    const tracked = tracker.getTrackedData()
    expect(tracked).toHaveLength(1)
    expect(tracked[0]).toEqual({ table: "profiles", id: "generated-profile-id" })
  })

  it("should create a test event and track it", async () => {
    const { createTestEvent, TestDataTracker } = await import("./db-test-utils")
    const tracker = new TestDataTracker()
    
    const mockKysely = {
      insertInto: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockReturnThis(),
      executeTakeFirstOrThrow: vi.fn().mockResolvedValue({
        id: "generated-event-id",
        title: "Test Event",
        is_test_data: true
      })
    }
    
    const event = await createTestEvent(tracker, mockKysely as any, {
      title: "Test Event"
    })
    
    expect(event.id).toBe("generated-event-id")
    expect(event.is_test_data).toBe(true)
    
    // Should track the created event
    const tracked = tracker.getTrackedData()
    expect(tracked).toHaveLength(1)
    expect(tracked[0]).toEqual({ table: "events", id: "generated-event-id" })
  })
})