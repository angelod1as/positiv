import { renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"
import { useNewsStatus } from "./use-news-status"

describe("useNewsStatus", () => {
  beforeEach(() => {
    // Clear all cookies before each test
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`)
    })
  })

  it("should return true when newsVersion cookie is older than NEWS_VERSION", () => {
    // Arrange: Set an old version in the cookie
    document.cookie = "newsVersion=1000000000000" // Old timestamp
    document.cookie = "showNews=true"

    // Act
    const { result } = renderHook(() => useNewsStatus())

    // Assert
    expect(result.current).toBe(true)
  })

  it("should return true when showNews cookie is not 'false'", () => {
    // Arrange: Set showNews to something other than "false"
    const currentVersion = Date.now()
    document.cookie = `newsVersion=${currentVersion}`
    document.cookie = "showNews=true"

    // Act
    const { result } = renderHook(() => useNewsStatus())

    // Assert
    expect(result.current).toBe(true)
  })

  it("should return false when version is current and showNews is 'false'", () => {
    // Arrange: Set current version and showNews to "false"
    // We need to mock NEWS_VERSION to match what we set
    const futureVersion = Date.now() + 1000000
    document.cookie = `newsVersion=${futureVersion}`
    document.cookie = "showNews=false"

    // Act
    const { result } = renderHook(() => useNewsStatus())

    // Assert
    expect(result.current).toBe(false)
  })

  it("should return true when newsVersion cookie is missing", () => {
    // Arrange: No cookies set (already cleared in beforeEach)

    // Act
    const { result } = renderHook(() => useNewsStatus())

    // Assert: Should default to showing news when cookie is missing
    expect(result.current).toBe(true)
  })

  it("should return true when showNews cookie is missing", () => {
    // Arrange: Set only newsVersion, not showNews
    const currentVersion = Date.now()
    document.cookie = `newsVersion=${currentVersion}`

    // Act
    const { result } = renderHook(() => useNewsStatus())

    // Assert: Should default to showing news when showNews cookie is missing
    expect(result.current).toBe(true)
  })

  it("should handle malformed cookie values gracefully", () => {
    // Arrange: Set invalid cookie values
    document.cookie = "newsVersion=invalid"
    document.cookie = "showNews=maybe"

    // Act
    const { result } = renderHook(() => useNewsStatus())

    // Assert: Should not crash and return a boolean
    expect(typeof result.current).toBe("boolean")
  })
})
