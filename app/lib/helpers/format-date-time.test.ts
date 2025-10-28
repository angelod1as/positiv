import { describe, expect, it } from "vitest"
import { formatDateTime } from "./format-date-time"

describe("formatDateTime - GMT-3 Timezone Verification", () => {
  it("should handle null or undefined input", () => {
    expect(formatDateTime(null)).toEqual({
      full: undefined,
      date: undefined,
      time: undefined,
    })
    expect(formatDateTime(undefined)).toEqual({
      full: undefined,
      date: undefined,
      time: undefined,
    })
  })

  describe("GMT-3 (America/Sao_Paulo) Timezone Conversion", () => {
    it("should convert UTC time to GMT-3", () => {
      const utcDate = "2024-12-25T23:00:00Z"
      const result = formatDateTime(utcDate)

      expect(result.time).toBe("20h")
      expect(result.date).toBe("25 de dezembro de 2024")
    })

    it("should handle UTC time that crosses date boundary when converted to GMT-3", () => {
      const utcDate = "2024-12-26T02:30:00Z"
      const result = formatDateTime(utcDate)

      expect(result.time).toBe("23h")
      expect(result.date).toBe("25 de dezembro de 2024")
    })

    it("should correctly format morning time in GMT-3", () => {
      const utcDate = "2024-12-25T13:00:00Z"
      const result = formatDateTime(utcDate)

      expect(result.time).toBe("10h")
      expect(result.date).toBe("25 de dezembro de 2024")
    })

    it("should correctly format midnight in GMT-3", () => {
      const utcDate = "2024-12-25T03:00:00Z"
      const result = formatDateTime(utcDate)

      expect(result.time).toBe("00h")
      expect(result.date).toBe("25 de dezembro de 2024")
    })
  })

  describe("Date format with 'long' option", () => {
    it("should format date with full month name", () => {
      const dateString = "2024-12-25T20:00:00-03:00"
      const result = formatDateTime(dateString, "long")

      expect(result.date).toBe("25 de dezembro de 2024")
    })

    it("should format full datetime string", () => {
      const dateString = "2024-12-25T20:00:00-03:00"
      const result = formatDateTime(dateString, "long")

      expect(result.full).toBe("25 de dezembro de 2024, às 20h")
    })
  })

  describe("Date format with 'short' option", () => {
    it("should format date with abbreviated month", () => {
      const dateString = "2024-12-25T20:00:00-03:00"
      const result = formatDateTime(dateString, "short")

      expect(result.date).toBe("25 dez. 24")
    })

    it("should format full datetime string with short date", () => {
      const dateString = "2024-12-25T20:00:00-03:00"
      const result = formatDateTime(dateString, "short")

      expect(result.full).toBe("25 dez. 24, às 20h")
    })
  })

  describe("Brazilian Portuguese locale", () => {
    it("should use Portuguese month names", () => {
      const dateString = "2024-01-15T12:00:00-03:00"
      const result = formatDateTime(dateString)

      expect(result.date).toBe("15 de janeiro de 2024")
    })

    it("should use Portuguese abbreviated month names", () => {
      const dateString = "2024-01-15T12:00:00-03:00"
      const result = formatDateTime(dateString, "short")

      expect(result.date).toBe("15 jan. 24")
    })
  })

  describe("Edge cases with explicit GMT-3 timestamp", () => {
    it("should correctly handle timestamp already in GMT-3", () => {
      const gmt3Date = "2024-12-25T20:00:00-03:00"
      const result = formatDateTime(gmt3Date)

      expect(result.time).toBe("20h")
      expect(result.date).toBe("25 de dezembro de 2024")
    })

    it("should handle timestamp with different UTC offset", () => {
      const usDate = "2024-12-25T18:00:00-05:00"
      const result = formatDateTime(usDate)

      expect(result.time).toBe("20h")
      expect(result.date).toBe("25 de dezembro de 2024")
    })
  })

  describe("Daylight Saving Time considerations", () => {
    it("should handle summer time in Brazil (GMT-3)", () => {
      const summerDate = "2024-01-15T23:00:00Z"
      const result = formatDateTime(summerDate)

      expect(result.time).toBe("20h")
      expect(result.date).toBe("15 de janeiro de 2024")
    })

    it("should handle winter time in Brazil (GMT-3)", () => {
      const winterDate = "2024-07-15T23:00:00Z"
      const result = formatDateTime(winterDate)

      expect(result.time).toBe("20h")
      expect(result.date).toBe("15 de julho de 2024")
    })
  })
})
