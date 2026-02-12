import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("~/lib/supabase/client", () => ({
  createBrowserClient: vi.fn(),
}))

vi.mock("remix-toast", () => ({
  redirectWithError: vi.fn(() => {
    throw new Response("", {
      status: 302,
      headers: { Location: "/dashboard" },
    })
  }),
}))

describe("getClientContext", () => {
  let mockSignOut: ReturnType<typeof vi.fn>
  let consoleSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    mockSignOut = vi.fn().mockResolvedValue({ error: null })
    consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    consoleSpy.mockRestore()
    vi.clearAllMocks()
  })

  const setupMockSupabase = async (
    error: { message?: string | null; code?: string } | null,
    data: { user: null } | null = null,
  ) => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data, error }),
        signOut: mockSignOut,
      },
    }

    const { createBrowserClient } = await import("~/lib/supabase/client")
    vi.mocked(createBrowserClient).mockReturnValue({
      supabase: mockSupabase as never,
    })

    return mockSupabase
  }

  it("should handle refresh_token_not_found by calling signOut and returning null user", async () => {
    await setupMockSupabase({
      message: "Invalid Refresh Token: Refresh Token Not Found",
      code: "refresh_token_not_found",
    })

    const { getClientContext } = await import("./auth.client")
    const result = await getClientContext()

    expect(result.currentUser).toBeNull()
    expect(result.currentProfile).toBeNull()
    expect(mockSignOut).toHaveBeenCalledTimes(1)
    expect(consoleSpy).not.toHaveBeenCalled()
  })

  it("should handle user_not_found by calling signOut and returning null user", async () => {
    await setupMockSupabase({
      message: "User from sub claim in JWT does not exist",
      code: "user_not_found",
    })

    const { getClientContext } = await import("./auth.client")
    const result = await getClientContext()

    expect(result.currentUser).toBeNull()
    expect(result.currentProfile).toBeNull()
    expect(mockSignOut).toHaveBeenCalledTimes(1)
    expect(consoleSpy).not.toHaveBeenCalled()
  })

  it("should handle Invalid Refresh Token message without code", async () => {
    await setupMockSupabase({
      message: "Invalid Refresh Token: Some other message",
      code: undefined,
    })

    const { getClientContext } = await import("./auth.client")
    const result = await getClientContext()

    expect(result.currentUser).toBeNull()
    expect(result.currentProfile).toBeNull()
    expect(mockSignOut).toHaveBeenCalledTimes(1)
    expect(consoleSpy).not.toHaveBeenCalled()
  })

  it("should still handle Auth session missing without signOut or redirect", async () => {
    await setupMockSupabase(
      { message: "Auth session missing!", code: undefined },
      { user: null },
    )

    const { getClientContext } = await import("./auth.client")
    const result = await getClientContext()

    expect(result.currentUser).toBeNull()
    expect(result.currentProfile).toBeNull()
    expect(mockSignOut).not.toHaveBeenCalled()
    expect(consoleSpy).not.toHaveBeenCalled()
  })
})
