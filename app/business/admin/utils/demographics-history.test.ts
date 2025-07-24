import { describe, expect, it, vi } from "vitest"
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

    it("should store demographics in the database", async () => {
      const mockKysely = {
        insertInto: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockReturnThis(),
        executeTakeFirstOrThrow: vi.fn().mockResolvedValue({
          id: "snapshot-id",
          event_id: "test-event-id",
          calculated_at: new Date().toISOString(),
          total: 15,
          veteran_yes: 60,
          veteran_no: 40
        })
      }

      vi.doMock("~/lib/supabase/db.server", () => ({
        kysely: mockKysely
      }))

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
      
      await storeEventDemographicsSnapshot({
        eventId: "test-event-id",
        demographics: mockDemographics
      })

      expect(mockKysely.insertInto).toHaveBeenCalledWith("event_demographics_history")
      expect(mockKysely.values).toHaveBeenCalledWith(expect.objectContaining({
        event_id: "test-event-id",
        total: 15,
        veteran_yes: 60,
        veteran_no: 40
      }))

      vi.doUnmock("~/lib/supabase/db.server")
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

    it("should fetch from database and transform to Demographics format", async () => {
      const mockKysely = {
        selectFrom: vi.fn().mockReturnThis(),
        selectAll: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        executeTakeFirst: vi.fn().mockResolvedValue({
          total: 20,
          veteran_yes: 70,
          veteran_no: 30,
          gender_cis: 60,
          gender_trans: 20,
          gender_agender: 10,
          gender_other_percentage: 10,
          gender_other_values: ["Non-binary"],
          orientation_straight: 40,
          orientation_homo: 20,
          orientation_bi_pan: 20,
          orientation_ace_demi: 10,
          orientation_other_percentage: 10,
          orientation_other_values: ["Questioning"],
          age_average: 27.5,
          age_min: 22,
          age_max: 40
        })
      }

      vi.doMock("~/lib/supabase/db.server", () => ({
        kysely: mockKysely
      }))

      const { getEventDemographicsHistory } = await import("./demographics-history")
      
      await getEventDemographicsHistory({
        eventId: "test-event-id"
      })

      expect(mockKysely.selectFrom).toHaveBeenCalledWith("event_demographics_history")
      expect(mockKysely.where).toHaveBeenCalledWith("event_id", "=", "test-event-id")
      expect(mockKysely.orderBy).toHaveBeenCalledWith("calculated_at", "desc")

      vi.doUnmock("~/lib/supabase/db.server")
    })
  })
})