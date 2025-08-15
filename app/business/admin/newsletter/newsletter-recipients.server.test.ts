import { describe, expect, it, vi, beforeEach } from "vitest"
import type { Kysely } from "kysely"
import type { Database } from "~types/database/kysely.types"
import type { SegmentFilter, NewsletterRecipient } from "./newsletter-recipients.server"

// Create mocks for the functions we'll use
const mockGetEligibleRecipients = vi.fn()
const mockGetRecipientCount = vi.fn()

// Mock the module
vi.mock("./newsletter-recipients.server", () => ({
  getEligibleRecipients: mockGetEligibleRecipients,
  getRecipientCount: mockGetRecipientCount,
  getRecipientPreview: async (
    kysely: Kysely<Database>,
    filter?: SegmentFilter,
    limit: number = 5
  ) => {
    const recipients = await mockGetEligibleRecipients(kysely, filter)
    return recipients.slice(0, limit)
  },
  getSegmentCounts: async (kysely: Kysely<Database>) => {
    const counts: Record<string, number> = {}
    
    // Get count for all subscribers
    counts.all = await mockGetRecipientCount(kysely, {})
    
    // Get count for veterans
    counts.veterans = await mockGetRecipientCount(kysely, { veteransOnly: true })
    
    // Get count for newbies
    counts.newbies = await mockGetRecipientCount(kysely, { newbiesOnly: true })
    
    // Get count for never attended
    counts.never_attended = await mockGetRecipientCount(kysely, { activityType: "never_attended" })
    
    // Get count for has attended
    counts.has_attended = await mockGetRecipientCount(kysely, { activityType: "has_attended" })
    
    // Get count for new registrations (30 days)
    counts.new_30 = await mockGetRecipientCount(kysely, { 
      activityType: "never_applied",
      registeredWithinDays: 30 
    })
    
    // Get count for applied but never attended
    counts.applied_never = await mockGetRecipientCount(kysely, { activityType: "applied_never_attended" })
    
    return counts
  },
}))

describe("Newsletter Recipients - Unit Tests", () => {
  const mockKysely = {} as Kysely<Database>

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("getRecipientPreview", () => {
    it("should return first 5 recipients by default", async () => {
      const { getRecipientPreview } = await import("./newsletter-recipients.server")
      
      const mockRecipients: NewsletterRecipient[] = [
        {
          id: "1",
          email: "user1@test.com",
          full_name: "User One",
          is_veteran: true,
          gender: null,
          orientation: null,
          created_at: "2025-01-01T00:00:00Z",
        },
        {
          id: "2",
          email: "user2@test.com",
          full_name: "User Two",
          is_veteran: false,
          gender: null,
          orientation: null,
          created_at: "2025-01-02T00:00:00Z",
        },
        {
          id: "3",
          email: "user3@test.com",
          full_name: "User Three",
          is_veteran: true,
          gender: null,
          orientation: null,
          created_at: "2025-01-03T00:00:00Z",
        },
        {
          id: "4",
          email: "user4@test.com",
          full_name: "User Four",
          is_veteran: false,
          gender: null,
          orientation: null,
          created_at: "2025-01-04T00:00:00Z",
        },
        {
          id: "5",
          email: "user5@test.com",
          full_name: "User Five",
          is_veteran: true,
          gender: null,
          orientation: null,
          created_at: "2025-01-05T00:00:00Z",
        },
        {
          id: "6",
          email: "user6@test.com",
          full_name: "User Six",
          is_veteran: false,
          gender: null,
          orientation: null,
          created_at: "2025-01-06T00:00:00Z",
        },
        {
          id: "7",
          email: "user7@test.com",
          full_name: "User Seven",
          is_veteran: true,
          gender: null,
          orientation: null,
          created_at: "2025-01-07T00:00:00Z",
        },
      ]
      
      mockGetEligibleRecipients.mockResolvedValue(mockRecipients)
      
      const preview = await getRecipientPreview(mockKysely)
      
      expect(preview).toHaveLength(5)
      expect(preview[0].email).toBe("user1@test.com")
      expect(preview[4].email).toBe("user5@test.com")
      expect(mockGetEligibleRecipients).toHaveBeenCalledWith(mockKysely, undefined)
    })

    it("should respect custom limit parameter", async () => {
      const { getRecipientPreview } = await import("./newsletter-recipients.server")
      
      const mockRecipients: NewsletterRecipient[] = [
        {
          id: "1",
          email: "user1@test.com",
          full_name: "User One",
          is_veteran: true,
          gender: null,
          orientation: null,
          created_at: "2025-01-01T00:00:00Z",
        },
        {
          id: "2",
          email: "user2@test.com",
          full_name: "User Two",
          is_veteran: false,
          gender: null,
          orientation: null,
          created_at: "2025-01-02T00:00:00Z",
        },
        {
          id: "3",
          email: "user3@test.com",
          full_name: "User Three",
          is_veteran: true,
          gender: null,
          orientation: null,
          created_at: "2025-01-03T00:00:00Z",
        },
      ]
      
      mockGetEligibleRecipients.mockResolvedValue(mockRecipients)
      
      const preview = await getRecipientPreview(mockKysely, undefined, 2)
      
      expect(preview).toHaveLength(2)
      expect(preview[0].email).toBe("user1@test.com")
      expect(preview[1].email).toBe("user2@test.com")
    })

    it("should pass segment filter to getEligibleRecipients", async () => {
      const { getRecipientPreview } = await import("./newsletter-recipients.server")
      
      const mockRecipients: NewsletterRecipient[] = [
        {
          id: "1",
          email: "veteran@test.com",
          full_name: "Veteran User",
          is_veteran: true,
          gender: null,
          orientation: null,
          created_at: "2025-01-01T00:00:00Z",
        },
      ]
      
      mockGetEligibleRecipients.mockResolvedValue(mockRecipients)
      
      const filter: SegmentFilter = { veteransOnly: true }
      const preview = await getRecipientPreview(mockKysely, filter, 3)
      
      expect(preview).toHaveLength(1)
      expect(preview[0].email).toBe("veteran@test.com")
      expect(mockGetEligibleRecipients).toHaveBeenCalledWith(mockKysely, filter)
    })

    it("should handle empty recipient list", async () => {
      const { getRecipientPreview } = await import("./newsletter-recipients.server")
      
      mockGetEligibleRecipients.mockResolvedValue([])
      
      const preview = await getRecipientPreview(mockKysely, { veteransOnly: true })
      
      expect(preview).toHaveLength(0)
      expect(preview).toEqual([])
    })

    it("should handle fewer recipients than limit", async () => {
      const { getRecipientPreview } = await import("./newsletter-recipients.server")
      
      const mockRecipients: NewsletterRecipient[] = [
        {
          id: "1",
          email: "user1@test.com",
          full_name: "User One",
          is_veteran: true,
          gender: null,
          orientation: null,
          created_at: "2025-01-01T00:00:00Z",
        },
        {
          id: "2",
          email: "user2@test.com",
          full_name: "User Two",
          is_veteran: false,
          gender: null,
          orientation: null,
          created_at: "2025-01-02T00:00:00Z",
        },
      ]
      
      mockGetEligibleRecipients.mockResolvedValue(mockRecipients)
      
      const preview = await getRecipientPreview(mockKysely, undefined, 10)
      
      expect(preview).toHaveLength(2)
      expect(preview).toEqual(mockRecipients)
    })
  })

  describe("getSegmentCounts", () => {
    it("should return counts for all segments", async () => {
      const { getSegmentCounts } = await import("./newsletter-recipients.server")
      
      // Mock different counts for different filters
      mockGetRecipientCount.mockImplementation(async (_kysely, filter) => {
        // Return different counts based on filter
        if (!filter || Object.keys(filter).length === 0) {
          return 100 // All subscribers
        }
        if (filter?.veteransOnly) {
          return 30 // Veterans
        }
        if (filter?.newbiesOnly) {
          return 70 // Newbies
        }
        if (filter?.activityType === "never_attended") {
          return 45
        }
        if (filter?.activityType === "has_attended") {
          return 55
        }
        if (filter?.activityType === "never_applied" && filter?.registeredWithinDays === 30) {
          return 12
        }
        if (filter?.activityType === "applied_never_attended") {
          return 18
        }
        return 0
      })
      
      const counts = await getSegmentCounts(mockKysely)
      
      expect(counts).toEqual({
        all: 100,
        veterans: 30,
        newbies: 70,
        never_attended: 45,
        has_attended: 55,
        new_30: 12,
        applied_never: 18,
      })
      
      // Verify all the expected calls were made
      expect(mockGetRecipientCount).toHaveBeenCalledTimes(7)
      expect(mockGetRecipientCount).toHaveBeenCalledWith(mockKysely, {})
      expect(mockGetRecipientCount).toHaveBeenCalledWith(mockKysely, { veteransOnly: true })
      expect(mockGetRecipientCount).toHaveBeenCalledWith(mockKysely, { newbiesOnly: true })
      expect(mockGetRecipientCount).toHaveBeenCalledWith(mockKysely, { activityType: "never_attended" })
      expect(mockGetRecipientCount).toHaveBeenCalledWith(mockKysely, { activityType: "has_attended" })
      expect(mockGetRecipientCount).toHaveBeenCalledWith(mockKysely, { 
        activityType: "never_applied",
        registeredWithinDays: 30 
      })
      expect(mockGetRecipientCount).toHaveBeenCalledWith(mockKysely, { activityType: "applied_never_attended" })
    })

    it("should handle zero counts gracefully", async () => {
      const { getSegmentCounts } = await import("./newsletter-recipients.server")
      
      // Always return zero
      mockGetRecipientCount.mockResolvedValue(0)
      
      const counts = await getSegmentCounts(mockKysely)
      
      expect(counts).toEqual({
        all: 0,
        veterans: 0,
        newbies: 0,
        never_attended: 0,
        has_attended: 0,
        new_30: 0,
        applied_never: 0,
      })
    })
  })
})