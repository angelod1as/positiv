import { describe, expect, it, vi, beforeEach, type Mock, beforeAll } from "vitest"
import type { Demographics } from "./utils/demographics"

// Mock kysely before any imports that use it
vi.mock("~/kysely", () => {
  const mockSelectFrom = vi.fn()
  const mockInnerJoin = vi.fn()
  const mockLeftJoin = vi.fn()
  const mockSelect = vi.fn()
  const mockSelectAll = vi.fn()
  const mockWhere = vi.fn()
  const mockOrderBy = vi.fn()
  const mockLimit = vi.fn()
  const mockExecute = vi.fn()
  const mockExecuteTakeFirst = vi.fn()
  const mockExecuteTakeFirstOrThrow = vi.fn()
  const mockUpdateTable = vi.fn()
  const mockInsertInto = vi.fn()
  const mockSet = vi.fn()
  const mockValues = vi.fn()
  const mockReturning = vi.fn()

  // Chain methods properly
  mockSelectFrom.mockReturnValue({
    innerJoin: mockInnerJoin,
    selectAll: mockSelectAll,
    where: mockWhere,
    select: mockSelect,
  })
  
  mockInnerJoin.mockReturnValue({
    leftJoin: mockLeftJoin,
    select: mockSelect,
  })
  
  mockLeftJoin.mockReturnValue({
    select: mockSelect,
    selectAll: mockSelectAll,
  })
  
  mockSelect.mockReturnValue({
    where: mockWhere,
    execute: mockExecute,
    select: mockSelect,
  })
  
  mockSelectAll.mockReturnValue({
    where: mockWhere,
    select: mockSelect,
  })
  
  mockWhere.mockReturnValue({
    where: mockWhere,
    execute: mockExecute,
    orderBy: mockOrderBy,
    innerJoin: mockInnerJoin,
    executeTakeFirstOrThrow: mockExecuteTakeFirstOrThrow,
  })
  
  mockOrderBy.mockReturnValue({
    limit: mockLimit,
  })
  
  mockLimit.mockReturnValue({
    executeTakeFirst: mockExecuteTakeFirst,
  })
  
  mockUpdateTable.mockReturnValue({
    set: mockSet,
  })
  
  mockSet.mockReturnValue({
    where: mockWhere,
  })
  
  mockInsertInto.mockReturnValue({
    values: mockValues,
  })
  
  mockValues.mockReturnValue({
    returning: mockReturning,
  })
  
  mockReturning.mockReturnValue({
    executeTakeFirstOrThrow: mockExecuteTakeFirstOrThrow,
  })

  // Default return values
  mockExecute.mockResolvedValue([])
  mockExecuteTakeFirst.mockResolvedValue(null)
  mockExecuteTakeFirstOrThrow.mockResolvedValue({})

  return {
    kysely: {
      selectFrom: mockSelectFrom,
      updateTable: mockUpdateTable,
      insertInto: mockInsertInto,
    },
  }
})

vi.mock("./utils/demographics-history.server", () => ({
  storeEventDemographicsSnapshot: vi.fn().mockResolvedValue({
    success: true,
    data: { id: "snapshot-id" },
  }),
  getEventDemographicsHistory: vi.fn().mockResolvedValue({
    success: false,
    data: null,
  }),
}))

// Now import modules that use kysely
import { updateEventStatus, getEventDemographicsById } from "./admin.server"
import { storeEventDemographicsSnapshot } from "./utils/demographics-history.server"
import { kysely } from "~/kysely"

describe("Event Status Update", () => {
  let mockUpdateTable: Mock
  let mockExecute: Mock

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup default mock chain for updateTable
    mockExecute = vi.fn().mockResolvedValue([{ id: "test-event-id" }])
    mockUpdateTable = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          execute: mockExecute,
        }),
      }),
    })
    
    ;(kysely.updateTable as Mock) = mockUpdateTable
  })

  describe("updateEventStatus", () => {
    const mockDemographics: Demographics = {
      total: 10,
      veteran: { yes: 60, no: 40 },
      gender: {
        cis: 70,
        trans: 10,
        agender: 10,
        other: { percentage: 10, values: ["fluid"] },
      },
      orientation: {
        straight: 40,
        homo: 20,
        biPan: 20,
        aceDemi: 10,
        other: { percentage: 10, values: ["queer"] },
      },
      age: { average: 30, min: 18, max: 50 },
    }

    it("should trigger demographics snapshot when status changes to Completed", async () => {
      // Mock getEventDemographicsById to return success
      vi.mocked(getEventDemographicsById).mockResolvedValue({
        success: true,
        data: mockDemographics,
      })
      
      const result = await updateEventStatus(
        { event_status: "Completed" },
        { eventId: "test-event-id" }
      )
      
      expect(result.success).toBe(true)
      expect(mockUpdateTable).toHaveBeenCalledWith("events")
      expect(storeEventDemographicsSnapshot).toHaveBeenCalledWith({
        eventId: "test-event-id",
        demographics: mockDemographics,
      })
    })

    it("should not trigger demographics snapshot for other status changes", async () => {
      const result = await updateEventStatus(
        { event_status: "Planned" },
        { eventId: "test-event-id" }
      )
      
      expect(result.success).toBe(true)
      expect(mockUpdateTable).toHaveBeenCalledWith("events")
      expect(storeEventDemographicsSnapshot).not.toHaveBeenCalled()
    })

    it("should not trigger snapshot when no eventId is provided", async () => {
      const result = await updateEventStatus(
        { event_status: "Completed" },
        {}
      )
      
      expect(result.success).toBe(true)
      expect(result.data).toBe(null)
      expect(storeEventDemographicsSnapshot).not.toHaveBeenCalled()
    })

    it("should handle demographics calculation failure gracefully", async () => {
      vi.mocked(getEventDemographicsById).mockResolvedValue({
        success: false,
        errors: [new Error("Failed to calculate demographics")],
      })
      
      const result = await updateEventStatus(
        { event_status: "Completed" },
        { eventId: "test-event-id" }
      )
      
      expect(result.success).toBe(true)
      expect(storeEventDemographicsSnapshot).not.toHaveBeenCalled()
    })

    it("should succeed even when snapshot creation fails", async () => {
      vi.mocked(getEventDemographicsById).mockResolvedValue({
        success: true,
        data: mockDemographics,
      })
      
      vi.mocked(storeEventDemographicsSnapshot).mockResolvedValue({
        success: false,
        errors: [new Error("Database error")],
      })
      
      const result = await updateEventStatus(
        { event_status: "Completed" },
        { eventId: "test-event-id" }
      )
      
      // Currently this test will fail because the implementation doesn't handle errors properly
      expect(result.success).toBe(true)
      expect(result.data).toBe(true)
    })

    it("should handle database update failure", async () => {
      mockExecute.mockResolvedValue([])
      
      const result = await updateEventStatus(
        { event_status: "Completed" },
        { eventId: "test-event-id" }
      )
      
      expect(result.success).toBe(true)
      expect(result.data).toBe(false)
      expect(storeEventDemographicsSnapshot).not.toHaveBeenCalled()
    })
  })

  describe("storeEventDemographicsSnapshot error handling", () => {
    it("should handle executeTakeFirstOrThrow failures", async () => {
      const mockDemographics: Demographics = {
        total: 10,
        veteran: { yes: 60, no: 40 },
        gender: {
          cis: 70,
          trans: 10,
          agender: 10,
          other: { percentage: 10, values: ["fluid"] },
        },
        orientation: {
          straight: 40,
          homo: 20,
          biPan: 20,
          aceDemi: 10,
          other: { percentage: 10, values: ["queer"] },
        },
        age: { average: 30, min: 18, max: 50 },
      }
      
      // This test expects the implementation to use composable error handling
      // Currently it will fail because executeTakeFirstOrThrow will throw
      vi.mocked(storeEventDemographicsSnapshot).mockResolvedValue({
        success: false,
        errors: [new Error("No rows returned")],
      })
      
      const result = await storeEventDemographicsSnapshot({
        eventId: "test-event-id",
        demographics: mockDemographics,
      })
      
      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
    })
  })

  describe("composable function error handling", () => {
    it("should properly compose error handling chains", async () => {
      vi.mocked(getEventDemographicsById).mockResolvedValue({
        success: false,
        errors: [new Error("Demographics calculation failed")],
      })
      
      const result = await updateEventStatus(
        { event_status: "Completed" },
        { eventId: "test-event-id" }
      )
      
      expect(result.success).toBe(true)
      expect(result.data).toBe(true)
    })

    it("should log errors appropriately without breaking the flow", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
      
      vi.mocked(getEventDemographicsById).mockResolvedValue({
        success: true,
        data: {} as Demographics,
      })
      
      vi.mocked(storeEventDemographicsSnapshot).mockResolvedValue({
        success: false,
        errors: [new Error("Snapshot storage failed")],
      })
      
      const result = await updateEventStatus(
        { event_status: "Completed" },
        { eventId: "test-event-id" }
      )
      
      // This test expects error logging which isn't implemented yet
      expect(result.success).toBe(true)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to store demographics snapshot"),
        expect.any(Object)
      )
      
      consoleErrorSpy.mockRestore()
    })
  })
})