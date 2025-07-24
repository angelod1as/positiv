import { describe, expect, it } from "vitest"
import type { Demographics } from "./demographics"

describe("Event Demographics History", () => {
  describe("storeEventDemographicsSnapshot", () => {
    it("should be defined as a function", async () => {
      const module = await import("./demographics-history")
      expect(module.storeEventDemographicsSnapshot).toBeDefined()
      expect(typeof module.storeEventDemographicsSnapshot).toBe("function")
    })

    it("should accept event ID and demographics data", async () => {
      const { storeEventDemographicsSnapshot } = await import("./demographics-history")
      
      const mockDemographics: Demographics = {
        total: 15,
        veteran: { yes: 60, no: 40 },
        gender: {
          cis: 70,
          trans: 20,
          agender: 5,
          other: { percentage: 5, values: ["Non-binary"] }
        },
        orientation: {
          straight: 30,
          homo: 25,
          biPan: 25,
          aceDemi: 10,
          other: { percentage: 10, values: ["Questioning"] }
        },
        age: { average: 28.5, min: 21, max: 45 }
      }
      
      const result = await storeEventDemographicsSnapshot({
        eventId: "test-event-id",
        demographics: mockDemographics
      })
      
      expect(result).toHaveProperty("success")
      if (result.success) {
        expect(result.data).toHaveProperty("id")
        expect(result.data).toHaveProperty("event_id", "test-event-id")
        expect(result.data).toHaveProperty("calculated_at")
      }
    })
  })

  describe("getEventDemographicsHistory", () => {
    it("should be defined as a function", async () => {
      const module = await import("./demographics-history")
      expect(module.getEventDemographicsHistory).toBeDefined()
      expect(typeof module.getEventDemographicsHistory).toBe("function")
    })

    it("should retrieve historical demographics for an event", async () => {
      const { getEventDemographicsHistory } = await import("./demographics-history")
      
      const result = await getEventDemographicsHistory({
        eventId: "test-event-id"
      })
      
      expect(result).toHaveProperty("success")
      if (result.success) {
        expect(result.data).toBeDefined()
        if (result.data) {
          expect(result.data).toHaveProperty("total")
          expect(result.data).toHaveProperty("veteran")
          expect(result.data).toHaveProperty("gender")
          expect(result.data).toHaveProperty("orientation")
          expect(result.data).toHaveProperty("age")
        }
      }
    })
  })
})