import { describe, expect, it } from "vitest"
import { EVENT_COLUMN_TO_ID, mapEventsToIds } from "./event-mapping"

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

const EXPECTED_COLUMNS = [
  "04/02/23",
  "01/07/23",
  "26/08/23",
  "11/11/23",
  "27/01/24",
  "Sáfica (24/02/24)",
  "Águas de março (16/03/24)",
  "Amarradona (18/05/24)",
  "Julina (20/07/24)",
  "Fim de ânus",
  "Renovadah",
  "Carnavrau",
  "Segurando Velas 19/04/25",
  "Rapa do Tacho",
  "MaiOral 17/05/25",
  "Corpus peladus",
]

describe("event-mapping", () => {
  describe("EVENT_COLUMN_TO_ID", () => {
    it("should have exactly 16 entries", () => {
      expect(Object.keys(EVENT_COLUMN_TO_ID)).toHaveLength(16)
    })

    it("should have all values as valid UUIDs", () => {
      for (const [column, id] of Object.entries(EVENT_COLUMN_TO_ID)) {
        expect(id, `UUID for "${column}" is invalid`).toMatch(UUID_REGEX)
      }
    })

    it("should have all expected spreadsheet column names as keys", () => {
      expect(Object.keys(EVENT_COLUMN_TO_ID).sort()).toEqual(
        EXPECTED_COLUMNS.sort(),
      )
    })
  })

  describe("mapEventsToIds", () => {
    it("should map column names to event IDs preserving values", () => {
      const input: Record<string, boolean | null> = {
        "04/02/23": true,
        "01/07/23": false,
        "26/08/23": null,
      }

      const result = mapEventsToIds(input)

      expect(result).toEqual({
        "d953e0d3-7a5e-4ff3-a161-0b855cf4c164": true,
        "6dfbb35c-6e2a-4bf7-a995-578e0e6dc82f": false,
        "31fd751e-0696-45d7-8811-c3572ff2e33e": null,
      })
    })

    it("should skip columns not in the mapping", () => {
      const input: Record<string, boolean | null> = {
        "04/02/23": true,
        "unknown-column": false,
      }

      const result = mapEventsToIds(input)

      expect(result).toEqual({
        "d953e0d3-7a5e-4ff3-a161-0b855cf4c164": true,
      })
    })

    it("should return empty object for empty input", () => {
      expect(mapEventsToIds({})).toEqual({})
    })

    it("should handle all columns at once", () => {
      const input: Record<string, boolean | null> = {}
      for (const col of EXPECTED_COLUMNS) {
        input[col] = true
      }

      const result = mapEventsToIds(input)

      expect(Object.keys(result)).toHaveLength(16)
      for (const id of Object.values(result)) {
        expect(id).toBe(true)
      }
    })
  })
})
