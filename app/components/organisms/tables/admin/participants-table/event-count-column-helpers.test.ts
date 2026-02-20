import { describe, expect, it } from "vitest"
import { eventCountComparator } from "./event-count-column-helpers"

describe("eventCountComparator", () => {
  describe("ordering two non-null numbers", () => {
    it("returns negative when a < b", () => {
      expect(eventCountComparator(3, 5)).toBeLessThan(0)
    })

    it("returns positive when a > b", () => {
      expect(eventCountComparator(5, 3)).toBeGreaterThan(0)
    })

    it("returns 0 when a === b", () => {
      expect(eventCountComparator(4, 4)).toBe(0)
    })
  })

  describe("null treated as -1", () => {
    it("returns negative when a is null and b is 5", () => {
      expect(eventCountComparator(null, 5)).toBeLessThan(0)
    })

    it("returns positive when a is 5 and b is null", () => {
      expect(eventCountComparator(5, null)).toBeGreaterThan(0)
    })

    it("returns 0 when both are null", () => {
      expect(eventCountComparator(null, null)).toBe(0)
    })

    it("returns positive when a is 0 and b is null", () => {
      expect(eventCountComparator(0, null)).toBeGreaterThan(0)
    })

    it("returns negative when a is null and b is 0", () => {
      expect(eventCountComparator(null, 0)).toBeLessThan(0)
    })
  })

  describe("non-finite numbers treated as -1", () => {
    it("returns negative when a is NaN and b is 5", () => {
      expect(eventCountComparator(NaN, 5)).toBeLessThan(0)
    })

    it("returns positive when a is 5 and b is NaN", () => {
      expect(eventCountComparator(5, NaN)).toBeGreaterThan(0)
    })

    it("returns 0 when both are NaN (both treated as -1)", () => {
      expect(eventCountComparator(NaN, NaN)).toBe(0)
    })

    it("returns 0 when a is NaN and b is null (both treated as -1)", () => {
      expect(eventCountComparator(NaN, null)).toBe(0)
    })
  })
})
