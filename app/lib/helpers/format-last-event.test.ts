import { describe, expect, it } from "vitest"
import { formatLastEvent } from "./format-last-event"

describe("formatLastEvent", () => {
  it("should format title and date correctly", () => {
    const result = formatLastEvent("Vem Quente", "2025-01-17T20:00:00Z")
    expect(result).toBe("17/01/25 - Vem Quente")
  })

  it("should truncate long titles with ellipsis", () => {
    const longTitle = "Vem Quente que Estamos Fervendo e Prontinhas"
    const result = formatLastEvent(longTitle, "2025-01-17T20:00:00Z")
    expect(result).toBe("17/01/25 - Vem Quente que Estam…")
    expect(result.length).toBeLessThanOrEqual(32)
  })

  it("should preserve short titles without truncation", () => {
    const shortTitle = "Festa"
    const result = formatLastEvent(shortTitle, "2025-01-17T20:00:00Z")
    expect(result).toBe("17/01/25 - Festa")
  })

  it("should handle missing title", () => {
    expect(formatLastEvent(null, "2025-01-17T20:00:00Z")).toBe("-")
    expect(formatLastEvent(undefined, "2025-01-17T20:00:00Z")).toBe("-")
  })

  it("should handle missing date", () => {
    expect(formatLastEvent("Vem Quente", null)).toBe("-")
    expect(formatLastEvent("Vem Quente", undefined)).toBe("-")
  })

  it("should handle both missing", () => {
    expect(formatLastEvent(null, null)).toBe("-")
    expect(formatLastEvent(undefined, undefined)).toBe("-")
  })

  it("should handle empty string title", () => {
    expect(formatLastEvent("", "2025-01-17T20:00:00Z")).toBe("-")
  })

  it("should handle timezone conversion correctly", () => {
    const utcDate = "2025-01-17T23:00:00Z"
    const result = formatLastEvent("Festa", utcDate)
    expect(result).toBe("17/01/25 - Festa")
  })

  it("should handle titles exactly at 20 characters without truncation", () => {
    const exactTitle = "12345678901234567890"
    const result = formatLastEvent(exactTitle, "2025-01-17T20:00:00Z")
    expect(result).toBe("17/01/25 - 12345678901234567890")
  })

  it("should truncate titles longer than 20 characters", () => {
    const longTitle = "123456789012345678901"
    const result = formatLastEvent(longTitle, "2025-01-17T20:00:00Z")
    expect(result).toBe("17/01/25 - 12345678901234567890…")
  })
})
