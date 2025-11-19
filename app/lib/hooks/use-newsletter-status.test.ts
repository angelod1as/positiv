import { renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ProfileWithRoles } from "~types/database/entities.types"
import { useNewsletterStatus } from "./use-newsletter-status"

describe("useNewsletterStatus", () => {
  beforeEach(() => {
    // Clear all cookies by setting them to expire in the past
    document.cookie.split(";").forEach((cookie) => {
      const name = cookie.split("=")[0].trim()
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`
    })
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  it("should return false when profile is null", () => {
    const { result } = renderHook(() => useNewsletterStatus(null))

    expect(result.current).toBe(false)
  })

  it("should return false when profile is undefined", () => {
    const { result } = renderHook(() => useNewsletterStatus(undefined))

    expect(result.current).toBe(false)
  })

  it("should return false when cookie says checked and shouldShow is false", () => {
    document.cookie =
      "newsletter-preference=" +
      encodeURIComponent(JSON.stringify({ checked: true, shouldShow: false }))

    const { result } = renderHook(() =>
      useNewsletterStatus({ id: "test-profile-id" } as ProfileWithRoles),
    )

    expect(result.current).toBe(false)
  })

  it("should return true when cookie says checked and shouldShow is true", () => {
    document.cookie =
      "newsletter-preference=" +
      encodeURIComponent(JSON.stringify({ checked: true, shouldShow: true }))

    const { result } = renderHook(() =>
      useNewsletterStatus({ id: "test-profile-id" } as ProfileWithRoles),
    )

    expect(result.current).toBe(true)
  })

  it("should fetch from API when cookie is not set", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ shouldShow: true }),
    })
    global.fetch = mockFetch

    const { result } = renderHook(() =>
      useNewsletterStatus({ id: "test-profile-id" } as ProfileWithRoles),
    )

    await waitFor(() => {
      expect(result.current).toBe(true)
    })

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/newsletter-status?profileId=test-profile-id",
    )
  })

  it("should fetch from API when cookie checked is false", async () => {
    document.cookie =
      "newsletter-preference=" +
      encodeURIComponent(JSON.stringify({ checked: false }))

    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ shouldShow: false }),
    })
    global.fetch = mockFetch

    const { result } = renderHook(() =>
      useNewsletterStatus({ id: "test-profile-id" } as ProfileWithRoles),
    )

    await waitFor(() => {
      expect(result.current).toBe(false)
    })

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/newsletter-status?profileId=test-profile-id",
    )
  })

  it("should return false when API call fails", async () => {
    const mockFetch = vi.fn().mockRejectedValueOnce(new Error("Network error"))
    global.fetch = mockFetch

    const { result } = renderHook(() =>
      useNewsletterStatus({ id: "test-profile-id" } as ProfileWithRoles),
    )

    await waitFor(() => {
      expect(result.current).toBe(false)
    })
  })

  it("should handle profile changes reactively", async () => {
    const profileWithId = { id: "profile-1" } as ProfileWithRoles
    const profileWithDifferentId = { id: "profile-2" } as ProfileWithRoles

    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ shouldShow: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ shouldShow: false }),
      })
    global.fetch = mockFetch

    const { result, rerender } = renderHook(
      ({ profile }) => useNewsletterStatus(profile),
      { initialProps: { profile: profileWithId } },
    )

    await waitFor(() => {
      expect(result.current).toBe(true)
    })

    rerender({ profile: profileWithDifferentId })

    await waitFor(() => {
      expect(result.current).toBe(false)
    })
  })
})
