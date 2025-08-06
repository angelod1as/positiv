import { describe, expect, it, vi, beforeEach } from "vitest"
import {
  fetchAllEvents,
  parseEventDate,
  findEventMatches,
  saveProgress,
  loadProgress,
  type MappingProgress,
} from "./generate-event-mapping"
import * as fs from "fs/promises"

vi.mock("~/lib/supabase/db.server", () => ({
  db: {
    selectFrom: vi.fn(() => ({
      select: vi.fn(() => ({
        orderBy: vi.fn(() => ({
          execute: vi.fn(),
        })),
      })),
    })),
  },
}))

vi.mock("fs/promises", () => ({
  default: {},
  writeFile: vi.fn(),
  readFile: vi.fn(),
}))

describe("generate-event-mapping", () => {
  describe("fetchAllEvents", () => {
    it("should fetch all events from database", async () => {
      const mockEvents = [
        {
          id: "event-1",
          title: "Sáfica Social",
          time_event_start: "2024-02-24T00:00:00",
        },
        {
          id: "event-2",
          title: "Festa de Verão",
          time_event_start: "2023-02-04T00:00:00",
        },
      ]

      const { db } = await import("~/lib/supabase/db.server")
      const mockExecute = vi.fn().mockResolvedValue(mockEvents)
      const mockOrderBy = vi.fn().mockReturnValue({
        execute: mockExecute,
      })
      const mockSelect = vi.fn().mockReturnValue({
        orderBy: mockOrderBy,
      })
      
      vi.mocked(db.selectFrom).mockImplementation(() => ({
        select: mockSelect,
      }) as unknown as ReturnType<typeof db.selectFrom>)

      const events = await fetchAllEvents()
      expect(events).toEqual(mockEvents)
    })
  })

  describe("parseEventDate", () => {
    it("should parse date from DD/MM/YY format", () => {
      const result = parseEventDate("04/02/23")
      expect(result).toEqual({
        hasDate: true,
        date: new Date("2023-02-04"),
        originalFormat: "04/02/23",
      })
    })

    it("should parse date from event name with date in parentheses", () => {
      const result = parseEventDate("Sáfica (24/02/24)")
      expect(result).toEqual({
        hasDate: true,
        date: new Date("2024-02-24"),
        originalFormat: "24/02/24",
        eventName: "Sáfica",
      })
    })

    it("should return no date for event names without dates", () => {
      const result = parseEventDate("Fim de ânus")
      expect(result).toEqual({
        hasDate: false,
        eventName: "Fim de ânus",
      })
    })
  })

  describe("findEventMatches", () => {
    const mockEvents = [
      {
        id: "event-1",
        title: "Sáfica Social",
        time_event_start: "2024-02-24T00:00:00",
      },
      {
        id: "event-2",
        title: "Festa de Verão",
        time_event_start: "2023-02-04T00:00:00",
      },
      {
        id: "event-3",
        title: "After Party",
        time_event_start: "2023-11-11T00:00:00",
      },
      {
        id: "event-4",
        title: "Festa Noturna",
        time_event_start: "2023-11-11T00:00:00",
      },
    ]

    it("should find exact date match", () => {
      const matches = findEventMatches("04/02/23", mockEvents)
      expect(matches).toHaveLength(1)
      expect(matches[0].event.id).toBe("event-2")
      expect(matches[0].matchType).toBe("exact_date")
    })

    it("should find multiple events on same date", () => {
      const matches = findEventMatches("11/11/23", mockEvents)
      expect(matches).toHaveLength(2)
      expect(matches[0].matchType).toBe("exact_date")
      expect(matches[1].matchType).toBe("exact_date")
    })

    it("should find partial name match", () => {
      const matches = findEventMatches("Sáfica (24/02/24)", mockEvents)
      expect(matches).toHaveLength(1)
      expect(matches[0].event.id).toBe("event-1")
      expect(matches[0].matchType).toBe("name_and_date")
    })

    it("should find fuzzy name match", () => {
      const matches = findEventMatches("Safica", mockEvents)
      expect(matches.length).toBeGreaterThan(0)
      expect(matches[0].event.title).toContain("Sáfica")
      expect(matches[0].matchType).toBe("fuzzy_name")
    })

    it("should return empty array for no matches", () => {
      const matches = findEventMatches("Evento Inexistente", mockEvents)
      expect(matches).toHaveLength(0)
    })
  })

  describe("progress management", () => {
    const mockProgress: MappingProgress = {
      mappings: {
        "04/02/23": { eventId: "event-1", comment: "Confirmed" },
      },
      currentIndex: 1,
      totalColumns: 5,
    }

    beforeEach(() => {
      vi.clearAllMocks()
    })

    it("should save progress to file", async () => {
      const writeFileMock = vi.mocked(fs.writeFile)
      writeFileMock.mockResolvedValue(undefined)

      await saveProgress(mockProgress)
      expect(writeFileMock).toHaveBeenCalledWith(
        expect.stringContaining("mapping-progress.json"),
        JSON.stringify(mockProgress, null, 2),
      )
    })

    it("should load progress from file", async () => {
      const readFileMock = vi.mocked(fs.readFile)
      readFileMock.mockResolvedValue(JSON.stringify(mockProgress))

      const loaded = await loadProgress()
      expect(loaded).toEqual(mockProgress)
    })

    it("should return null if progress file doesn't exist", async () => {
      const readFileMock = vi.mocked(fs.readFile)
      const error = new Error("ENOENT: no such file or directory") as NodeJS.ErrnoException
      error.code = "ENOENT"
      readFileMock.mockRejectedValue(error)

      const loaded = await loadProgress()
      expect(loaded).toBeNull()
    })
  })
})