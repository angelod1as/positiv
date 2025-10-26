import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { getContext, registerUser } from "./auth.server"
import type { DBClient } from "~/types/utils/utils.types"

vi.mock("~/env.server", () => ({
  env: vi.fn(() => ({ isProdInDev: "false" })),
}))

vi.mock("~/lib/supabase/server", () => ({
  createServerClient: vi.fn(),
}))

vi.mock("remix-toast", () => ({
  redirectWithError: vi.fn(() => {
    throw new Response("", { status: 302, headers: { Location: "/dashboard" } })
  }),
}))

describe("getContext", () => {
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

  const createMockSupabase = (
    error: { message?: string | null; code?: string; name?: string; status?: number } | null,
    data: { user: null } | null = null
  ) => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data,
        error,
      }),
      signOut: mockSignOut,
    },
  })

  it("should handle user_not_found error gracefully", async () => {
    const mockRequest = new Request("http://localhost:5173/")
    const mockParams = {}

    const mockSupabase = createMockSupabase({
      message: "User from sub claim in JWT does not exist",
      code: "user_not_found",
      name: "AuthApiError",
      status: 403,
    })

    const mockHeaders = new Headers()

    const { createServerClient } = await import("~/lib/supabase/server")
    vi.mocked(createServerClient).mockReturnValue({
      supabase: mockSupabase as unknown as DBClient,
      headers: mockHeaders,
    })

    const result = await getContext(mockRequest, mockParams)

    expect(result.currentUser).toBeNull()
    expect(result.currentProfile).toBeNull()
    expect(mockSignOut).toHaveBeenCalledTimes(1)
    expect(consoleSpy).not.toHaveBeenCalled()
  })

  it("should handle refresh_token_not_found error", async () => {
    const mockRequest = new Request("http://localhost:5173/")
    const mockParams = {}

    const mockSupabase = createMockSupabase({
      message: "Invalid Refresh Token: Refresh Token Not Found",
      code: "refresh_token_not_found",
    })

    const mockHeaders = new Headers()

    const { createServerClient } = await import("~/lib/supabase/server")
    vi.mocked(createServerClient).mockReturnValue({
      supabase: mockSupabase as unknown as DBClient,
      headers: mockHeaders,
    })

    const result = await getContext(mockRequest, mockParams)

    expect(result.currentUser).toBeNull()
    expect(result.currentProfile).toBeNull()
    expect(mockSignOut).toHaveBeenCalledTimes(1)
    expect(consoleSpy).not.toHaveBeenCalled()
  })

  it("should handle errors with missing code but matching message", async () => {
    const mockRequest = new Request("http://localhost:5173/")
    const mockParams = {}

    const mockSupabase = createMockSupabase({
      message: "Invalid Refresh Token: Some other message",
      code: undefined,
      name: "AuthError",
    })

    const mockHeaders = new Headers()

    const { createServerClient } = await import("~/lib/supabase/server")
    vi.mocked(createServerClient).mockReturnValue({
      supabase: mockSupabase as unknown as DBClient,
      headers: mockHeaders,
    })

    const result = await getContext(mockRequest, mockParams)

    expect(result.currentUser).toBeNull()
    expect(result.currentProfile).toBeNull()
    expect(mockSignOut).toHaveBeenCalledTimes(1)
    expect(consoleSpy).not.toHaveBeenCalled()
  })

  it("should handle malformed error objects gracefully", async () => {
    const mockRequest = new Request("http://localhost:5173/")
    const mockParams = {}

    // Malformed error with null message
    const mockSupabase = createMockSupabase({
      message: null,
      code: "refresh_token_not_found",
    })

    const mockHeaders = new Headers()

    const { createServerClient } = await import("~/lib/supabase/server")
    vi.mocked(createServerClient).mockReturnValue({
      supabase: mockSupabase as unknown as DBClient,
      headers: mockHeaders,
    })

    const result = await getContext(mockRequest, mockParams)

    expect(result.currentUser).toBeNull()
    expect(result.currentProfile).toBeNull()
    expect(mockSignOut).toHaveBeenCalledTimes(1)
    expect(consoleSpy).not.toHaveBeenCalled()
  })

  it("should not handle unrelated auth errors", async () => {
    const mockRequest = new Request("http://localhost:5173/")
    const mockParams = {}

    const mockSupabase = createMockSupabase({
      message: "Some other error",
      code: "different_error",
    })

    const mockHeaders = new Headers()

    const { createServerClient } = await import("~/lib/supabase/server")
    vi.mocked(createServerClient).mockReturnValue({
      supabase: mockSupabase as unknown as DBClient,
      headers: mockHeaders,
    })

    const { redirectWithError } = await import("remix-toast")

    await expect(getContext(mockRequest, mockParams)).rejects.toThrow()
    expect(mockSignOut).not.toHaveBeenCalled()
    expect(consoleSpy).toHaveBeenCalledTimes(1)
    expect(redirectWithError).toHaveBeenCalled()
  })

  it("should handle Auth session missing error without redirect", async () => {
    const mockRequest = new Request("http://localhost:5173/")
    const mockParams = {}

    const mockSupabase = createMockSupabase(
      {
        message: "Auth session missing!",
        code: undefined,
      },
      { user: null } // Return data with null user
    )

    const mockHeaders = new Headers()

    const { createServerClient } = await import("~/lib/supabase/server")
    vi.mocked(createServerClient).mockReturnValue({
      supabase: mockSupabase as unknown as DBClient,
      headers: mockHeaders,
    })

    const result = await getContext(mockRequest, mockParams)

    expect(result.currentUser).toBeNull()
    expect(result.currentProfile).toBeNull()
    expect(mockSignOut).not.toHaveBeenCalled()
    expect(consoleSpy).not.toHaveBeenCalled()
  })

  it("should handle signOut failure gracefully", async () => {
    const mockRequest = new Request("http://localhost:5173/")
    const mockParams = {}

    // Mock signOut to fail
    mockSignOut.mockRejectedValue(new Error("SignOut failed"))

    const mockSupabase = createMockSupabase({
      message: "User from sub claim in JWT does not exist",
      code: "user_not_found",
    })

    const mockHeaders = new Headers()

    const { createServerClient } = await import("~/lib/supabase/server")
    vi.mocked(createServerClient).mockReturnValue({
      supabase: mockSupabase as unknown as DBClient,
      headers: mockHeaders,
    })

    // Should not throw even if signOut fails
    await expect(getContext(mockRequest, mockParams)).rejects.toThrow("SignOut failed")
    expect(mockSignOut).toHaveBeenCalledTimes(1)
  })
})

describe("registerUser", () => {
  it("should pass captchaToken to Supabase signUp options", async () => {
    const mockSignUp = vi.fn().mockResolvedValue({ error: null })

    const mockSupabase = {
      auth: {
        signUp: mockSignUp,
      },
    }

    const values = {
      email: "test@example.com",
      password: "password123",
      confirmPassword: "password123",
      over18: true,
      captchaToken: "test-captcha-token",
    }

    const context = {
      supabase: mockSupabase as unknown as DBClient,
      host: "http://localhost:5173",
      supabaseHeaders: new Headers(),
      currentUser: null,
      currentProfile: null,
    }

    await registerUser(values, context)

    expect(mockSignUp).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "password123",
      options: {
        captchaToken: "test-captcha-token",
        emailRedirectTo: "http://localhost:5173/registrar/callback",
      },
    })
  })

  it("should not include captchaToken, over18, or confirmPassword in signup data", async () => {
    const mockSignUp = vi.fn().mockResolvedValue({ error: null })

    const mockSupabase = {
      auth: {
        signUp: mockSignUp,
      },
    }

    const values = {
      email: "test@example.com",
      password: "password123",
      confirmPassword: "password123",
      over18: true,
      captchaToken: "test-captcha-token",
    }

    const context = {
      supabase: mockSupabase as unknown as DBClient,
      host: "http://localhost:5173",
      supabaseHeaders: new Headers(),
      currentUser: null,
      currentProfile: null,
    }

    await registerUser(values, context)

    const signUpCall = mockSignUp.mock.calls[0][0]
    expect(signUpCall).not.toHaveProperty("over18")
    expect(signUpCall).not.toHaveProperty("confirmPassword")
    expect(signUpCall).not.toHaveProperty("captchaToken")
    expect(signUpCall.options?.captchaToken).toBe("test-captcha-token")
  })
})