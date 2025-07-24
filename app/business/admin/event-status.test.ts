import { describe, expect, it, vi, beforeEach } from "vitest"
import type { Demographics } from "./utils/demographics"

// Mock the demographics functions
vi.mock("./utils/demographics-history.server", () => ({
  storeEventDemographicsSnapshot: vi.fn(),
  getEventDemographicsHistory: vi.fn(),
}))

// Mock kysely
vi.mock("~/kysely", () => ({
  kysely: {
    selectFrom: vi.fn(),
    updateTable: vi.fn(),
    insertInto: vi.fn(),
  },
}))

// Now import modules that use the mocks
import { updateEventStatus } from "./admin.server"
import { storeEventDemographicsSnapshot, getEventDemographicsHistory } from "./utils/demographics-history.server"
import { kysely } from "~/kysely"

describe("Event Status Update", () => {
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

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup default mock for updateTable
    const mockExecute = vi.fn().mockResolvedValue([{ id: "test-event-id" }])
    const mockWhere = vi.fn().mockReturnValue({ execute: mockExecute })
    const mockSet = vi.fn().mockReturnValue({ where: mockWhere })
    vi.mocked(kysely.updateTable).mockReturnValue({ set: mockSet } as any)
    
    // Setup default mock for storeEventDemographicsSnapshot
    vi.mocked(storeEventDemographicsSnapshot).mockResolvedValue({
      success: true,
      data: { id: "snapshot-id" },
    } as any)
    
    // Setup default mock for getEventDemographicsHistory
    vi.mocked(getEventDemographicsHistory).mockResolvedValue({
      success: false,
      data: null,
    } as any)
    
    // Setup complex mock chain for selectFrom (demographics calculation)
    const setupSelectFromMock = () => {
      const mockExecute = vi.fn().mockResolvedValue([
        {
          date_of_birth: "1990-01-01",
          gender: "Cis",
          is_veteran: true,
          orientation: "Hetero",
        }
      ])
      const mockSelect = vi.fn().mockReturnValue({ execute: mockExecute })
      const mockInnerJoin = vi.fn().mockReturnValue({ select: mockSelect })
      const mockWhere2 = vi.fn().mockReturnValue({ innerJoin: mockInnerJoin })
      const mockWhere1 = vi.fn().mockReturnValue({ where: mockWhere2 })
      
      const mockExecuteTakeFirst = vi.fn().mockResolvedValue({ count: "10" })
      const mockWhereCount = vi.fn().mockReturnValue({ executeTakeFirst: mockExecuteTakeFirst })
      const mockWhereCount2 = vi.fn().mockReturnValue({ where: mockWhereCount })
      const mockSelectCount = vi.fn().mockReturnValue({ where: mockWhereCount2 })
      const mockInnerJoinCount = vi.fn().mockReturnValue({ select: mockSelectCount })
      
      const mockExecuteTakeFirstHistory = vi.fn().mockResolvedValue(null)
      const mockLimit = vi.fn().mockReturnValue({ executeTakeFirst: mockExecuteTakeFirstHistory })
      const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit })
      const mockWhereHistory = vi.fn().mockReturnValue({ orderBy: mockOrderBy })
      const mockSelectAll = vi.fn().mockReturnValue({ where: mockWhereHistory })
      
      const mockSelectFrom = vi.fn()
      mockSelectFrom.mockImplementation((table: string) => {
        if (table === "event_participants") {
          return { where: mockWhere1 }
        } else if (table === "event_participants as current_ep") {
          // For the complex query in profilesWithExtraDataQuery
          const mockLeftJoin = vi.fn().mockReturnValue({ 
            selectAll: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  execute: vi.fn().mockResolvedValue([])
                })
              })
            })
          })
          const mockInnerJoinProfile = vi.fn().mockReturnValue({ leftJoin: mockLeftJoin })
          return { innerJoin: mockInnerJoinProfile }
        } else if (table === "event_demographics_history") {
          return { selectAll: mockSelectAll }
        }
        // For count query
        return { innerJoin: mockInnerJoinCount }
      })
      
      return mockSelectFrom
    }
    
    vi.mocked(kysely.selectFrom).mockImplementation(setupSelectFromMock())
  })

  describe("updateEventStatus", () => {
    it("should trigger demographics snapshot when status changes to Completed", async () => {
      const result = await updateEventStatus(
        { event_status: "Completed" },
        { eventId: "test-event-id" }
      )
      
      expect(result.success).toBe(true)
      expect(kysely.updateTable).toHaveBeenCalledWith("events")
      expect(storeEventDemographicsSnapshot).toHaveBeenCalledWith({
        eventId: "test-event-id",
        demographics: expect.any(Object),
      })
    })

    it("should not trigger demographics snapshot for other status changes", async () => {
      const result = await updateEventStatus(
        { event_status: "Planned" },
        { eventId: "test-event-id" }
      )
      
      expect(result.success).toBe(true)
      expect(kysely.updateTable).toHaveBeenCalledWith("events")
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
      // Mock the query to throw an error
      const mockExecute = vi.fn().mockRejectedValue(new Error("Database error"))
      const mockSelect = vi.fn().mockReturnValue({ execute: mockExecute })
      const mockInnerJoin = vi.fn().mockReturnValue({ select: mockSelect })
      const mockWhere2 = vi.fn().mockReturnValue({ innerJoin: mockInnerJoin })
      const mockWhere1 = vi.fn().mockReturnValue({ where: mockWhere2 })
      const mockSelectFrom = vi.fn().mockReturnValue({ where: mockWhere1 })
      
      vi.mocked(kysely.selectFrom).mockImplementation(mockSelectFrom)
      
      const result = await updateEventStatus(
        { event_status: "Completed" },
        { eventId: "test-event-id" }
      )
      
      expect(result.success).toBe(true)
      expect(storeEventDemographicsSnapshot).not.toHaveBeenCalled()
    })

    it("should succeed even when snapshot creation fails", async () => {
      vi.mocked(storeEventDemographicsSnapshot).mockResolvedValue({
        success: false,
        errors: [new Error("Database error")],
      } as any)
      
      const result = await updateEventStatus(
        { event_status: "Completed" },
        { eventId: "test-event-id" }
      )
      
      expect(result.success).toBe(true)
      expect(result.data).toBe(true)
    })

    it("should handle database update failure", async () => {
      const mockExecute = vi.fn().mockResolvedValue([])
      const mockWhere = vi.fn().mockReturnValue({ execute: mockExecute })
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere })
      vi.mocked(kysely.updateTable).mockReturnValue({ set: mockSet } as any)
      
      const result = await updateEventStatus(
        { event_status: "Completed" },
        { eventId: "test-event-id" }
      )
      
      expect(result.success).toBe(true)
      expect(result.data).toBe(false)
      expect(storeEventDemographicsSnapshot).not.toHaveBeenCalled()
    })
  })

  describe("composable function error handling", () => {
    it("should log errors appropriately without breaking the flow", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
      
      vi.mocked(storeEventDemographicsSnapshot).mockResolvedValue({
        success: false,
        errors: [new Error("Snapshot storage failed")],
      } as any)
      
      const result = await updateEventStatus(
        { event_status: "Completed" },
        { eventId: "test-event-id" }
      )
      
      expect(result.success).toBe(true)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to store demographics snapshot for event",
        expect.objectContaining({
          eventId: "test-event-id",
          errors: expect.any(Array),
        })
      )
      
      consoleErrorSpy.mockRestore()
    })
  })
})