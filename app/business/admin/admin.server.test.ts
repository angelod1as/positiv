import { describe, expect, it } from "vitest"

describe("getParticipantFullEventHistory", () => {
  it("should be defined with correct function signature", () => {
    // This test will fail until we create the function
    // We're testing that the function exists and returns the expected shape
    import("./admin.server").then((module) => {
      expect(module.getParticipantFullEventHistory).toBeDefined()
      expect(typeof module.getParticipantFullEventHistory).toBe("function")
    })
  })

  it("should return participant event history for a given profile", async () => {
    // This test defines the expected behavior:
    // - Function accepts profileId and excludeEventId
    // - Returns a composable result with success/data
    // - Data is array of ParticipantVsEvent with additional event fields
    const { getParticipantFullEventHistory } = await import("./admin.server")
    
    // This will fail until implemented
    const result = await getParticipantFullEventHistory({
      profileId: "test-profile-id",
      excludeEventId: "current-event-id",
    })

    expect(result).toHaveProperty("success")
    if (result.success) {
      expect(Array.isArray(result.data)).toBe(true)
      // Each item should have event participant fields plus event info
      if (result.data.length > 0) {
        const firstEvent = result.data[0]
        expect(firstEvent).toHaveProperty("id")
        expect(firstEvent).toHaveProperty("profile_id")
        expect(firstEvent).toHaveProperty("event_id")
        expect(firstEvent).toHaveProperty("event_title")
        expect(firstEvent).toHaveProperty("event_emoji")
        expect(firstEvent).toHaveProperty("time_event_start")
        expect(firstEvent).toHaveProperty("application_status")
        expect(firstEvent).toHaveProperty("attendance_status")
        expect(firstEvent).toHaveProperty("admin_general_notes")
      }
    }
  })

  it("should exclude the current event from history", async () => {
    const { getParticipantFullEventHistory } = await import("./admin.server")
    
    const result = await getParticipantFullEventHistory({
      profileId: "test-profile-id",
      excludeEventId: "event-to-exclude",
    })

    if (result.success) {
      // Verify no event in the result has the excluded event ID
      const hasExcludedEvent = result.data.some(
        (event) => event.event_id === "event-to-exclude"
      )
      expect(hasExcludedEvent).toBe(false)
    }
  })

  it("should order events by date descending (most recent first)", async () => {
    const { getParticipantFullEventHistory } = await import("./admin.server")
    
    const result = await getParticipantFullEventHistory({
      profileId: "test-profile-id",
      excludeEventId: "current-event",
    })

    if (result.success && result.data.length > 1) {
      // Check that events are ordered by date descending
      for (let i = 0; i < result.data.length - 1; i++) {
        const currentDate = new Date(result.data[i].time_event_start)
        const nextDate = new Date(result.data[i + 1].time_event_start)
        expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime())
      }
    }
  })
})