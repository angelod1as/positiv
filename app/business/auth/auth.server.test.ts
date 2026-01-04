import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { DBClient } from "~/types/utils/utils.types"
import { getContext, registerUser } from "./auth.server"

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

vi.mock("~/kysely", () => ({
  kysely: {
    selectFrom: vi.fn(),
  },
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
    error: {
      message?: string | null
      code?: string
      name?: string
      status?: number
    } | null,
    data: { user: null } | null = null,
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

  it("should handle missing oauth_client_id error gracefully", async () => {
    const mockRequest = new Request("http://localhost:5173/")
    const mockParams = {}

    const mockSupabase = createMockSupabase({
      message: "missing destination name oauth_client_id in *models.Session",
      code: "unexpected_failure",
      name: "AuthApiError",
      status: 500,
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
      { user: null }, // Return data with null user
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
    await expect(getContext(mockRequest, mockParams)).rejects.toThrow(
      "SignOut failed",
    )
    expect(mockSignOut).toHaveBeenCalledTimes(1)
  })

  it("should cache auth results per request", async () => {
    const mockRequest = new Request("http://localhost:5173/")
    const mockParams = {}

    const mockUser = {
      id: "test-user-id",
      email: "test@example.com",
    }

    const mockProfile = {
      id: "test-profile-id",
      email: "test@example.com",
      is_admin: false,
      basic_data_filled: true,
      created_at: "2025-01-01",
    }

    const mockGetUser = vi.fn().mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })

    const mockRpc = vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: mockProfile,
        error: null,
      }),
    })

    const mockSupabase = {
      auth: {
        getUser: mockGetUser,
        signOut: mockSignOut,
      },
      rpc: mockRpc,
    }

    const mockHeaders = new Headers()

    const { createServerClient } = await import("~/lib/supabase/server")
    vi.mocked(createServerClient).mockReturnValue({
      supabase: mockSupabase as unknown as DBClient,
      headers: mockHeaders,
    })

    // First call
    const result1 = await getContext(mockRequest, mockParams)

    // Second call with same request - should use cache
    const result2 = await getContext(mockRequest, mockParams)

    // Should only call DB once
    expect(mockGetUser).toHaveBeenCalledTimes(1)
    expect(mockRpc).toHaveBeenCalledTimes(1)

    // Results should be identical
    expect(result1).toEqual(result2)
    expect(result1.currentUser?.id).toBe("test-user-id")
    expect(result1.currentProfile?.id).toBe("test-profile-id")
  })

  it("should not share cache between different requests", async () => {
    const mockRequest1 = new Request("http://localhost:5173/page1")
    const mockRequest2 = new Request("http://localhost:5173/page2")
    const mockParams = {}

    const mockUser = {
      id: "test-user-id",
      email: "test@example.com",
    }

    const mockProfile = {
      id: "test-profile-id",
      email: "test@example.com",
      is_admin: false,
      basic_data_filled: true,
      created_at: "2025-01-01",
    }

    const mockGetUser = vi.fn().mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })

    const mockRpc = vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: mockProfile,
        error: null,
      }),
    })

    const mockSupabase = {
      auth: {
        getUser: mockGetUser,
        signOut: mockSignOut,
      },
      rpc: mockRpc,
    }

    const mockHeaders = new Headers()

    const { createServerClient } = await import("~/lib/supabase/server")
    vi.mocked(createServerClient).mockReturnValue({
      supabase: mockSupabase as unknown as DBClient,
      headers: mockHeaders,
    })

    // Call with first request
    await getContext(mockRequest1, mockParams)

    // Call with second request - should NOT use cache
    await getContext(mockRequest2, mockParams)

    // Should call DB twice (once per request)
    expect(mockGetUser).toHaveBeenCalledTimes(2)
    expect(mockRpc).toHaveBeenCalledTimes(2)
  })

  it("should handle concurrent calls to same request correctly", async () => {
    const mockRequest = new Request("http://localhost:5173/")
    const mockParams = {}

    const mockUser = {
      id: "test-user-id",
      email: "test@example.com",
    }

    const mockProfile = {
      id: "test-profile-id",
      email: "test@example.com",
      is_admin: false,
      basic_data_filled: true,
      created_at: "2025-01-01",
    }

    const mockGetUser = vi.fn().mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })

    const mockRpc = vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: mockProfile,
        error: null,
      }),
    })

    const mockSupabase = {
      auth: {
        getUser: mockGetUser,
        signOut: mockSignOut,
      },
      rpc: mockRpc,
    }

    const mockHeaders = new Headers()

    const { createServerClient } = await import("~/lib/supabase/server")
    vi.mocked(createServerClient).mockReturnValue({
      supabase: mockSupabase as unknown as DBClient,
      headers: mockHeaders,
    })

    // Make concurrent calls
    const [result1, result2, result3] = await Promise.all([
      getContext(mockRequest, mockParams),
      getContext(mockRequest, mockParams),
      getContext(mockRequest, mockParams),
    ])

    // Should only call DB once despite 3 concurrent calls
    expect(mockGetUser).toHaveBeenCalledTimes(1)
    expect(mockRpc).toHaveBeenCalledTimes(1)

    // All results should be identical
    expect(result1).toEqual(result2)
    expect(result2).toEqual(result3)
  })
})

describe("registerUser", () => {
  // Set up default Kysely mock to return no existing profile
  beforeEach(async () => {
    const { kysely } = await import("~/kysely")
    vi.mocked(kysely.selectFrom).mockReturnValue({
      select: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          executeTakeFirst: vi.fn().mockResolvedValue(undefined),
        }),
      }),
    } as never)
  })

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
        emailRedirectTo: "http://localhost:5173/auth/confirm",
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

  it("should send password reset email when user already registered", async () => {
    const mockSignUp = vi
      .fn()
      .mockResolvedValue({ error: { message: "User already registered" } })
    const mockResetPassword = vi.fn().mockResolvedValue({ error: null })

    const mockSupabase = {
      auth: {
        signUp: mockSignUp,
        resetPasswordForEmail: mockResetPassword,
      },
    }

    const values = {
      email: "existing@example.com",
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

    const result = await registerUser(values, context)

    expect(mockSignUp).toHaveBeenCalled()
    expect(mockResetPassword).toHaveBeenCalledWith("existing@example.com", {
      redirectTo: "http://localhost:5173/auth/confirm",
    })
    expect(result).toEqual({ success: true, data: values, errors: [] })
  })

  it("should return error when password reset fails for existing user", async () => {
    const mockSignUp = vi
      .fn()
      .mockResolvedValue({ error: { message: "User already registered" } })
    const mockResetPassword = vi
      .fn()
      .mockResolvedValue({ error: { message: "Email service down" } })

    const mockSupabase = {
      auth: {
        signUp: mockSignUp,
        resetPasswordForEmail: mockResetPassword,
      },
    }

    const values = {
      email: "existing@example.com",
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

    const result = await registerUser(values, context)

    expect(result.success).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].message).toContain(
      "Ops, ocorreu um erro ao tentar enviar o email",
    )
  })

  it("should return error for other signup errors", async () => {
    const mockSignUp = vi
      .fn()
      .mockResolvedValue({ error: { message: "Some other error" } })

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

    const result = await registerUser(values, context)

    expect(result.success).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].message).toContain("Ops, ocorreu um erro")
  })

  it("should redirect to error page when email already exists in profiles", async () => {
    const mockSignUp = vi.fn().mockResolvedValue({ error: null })

    const mockSupabase = {
      auth: {
        signUp: mockSignUp,
      },
    }

    // Mock Kysely to return an existing profile
    const { kysely } = await import("~/kysely")
    const mockExecuteTakeFirst = vi
      .fn()
      .mockResolvedValue({ id: "existing-profile-id" })
    vi.mocked(kysely.selectFrom).mockReturnValue({
      select: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          executeTakeFirst: mockExecuteTakeFirst,
        }),
      }),
    } as never)

    const values = {
      email: "existing@example.com",
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

    // composable-functions catches thrown Responses and wraps them in a result
    const result = await registerUser(values, context)

    // Should return a failure (the thrown Response is wrapped in an Error)
    expect(result.success).toBe(false)
    expect(result.errors).toHaveLength(1)
    // The error message is "{}" (stringified Response)
    expect((result.errors[0] as Error).message).toBe("{}")

    // Kysely should have been called to check for existing profile
    expect(kysely.selectFrom).toHaveBeenCalledWith("profiles")

    // signUp should NOT have been called because we throw before reaching it
    expect(mockSignUp).not.toHaveBeenCalled()
  })

  it("should proceed with signup when email does not exist in profiles", async () => {
    const mockSignUp = vi.fn().mockResolvedValue({ error: null })

    const mockSupabase = {
      auth: {
        signUp: mockSignUp,
      },
    }

    // Mock Kysely to return no existing profile
    const { kysely } = await import("~/kysely")
    const mockExecuteTakeFirst = vi.fn().mockResolvedValue(undefined)
    vi.mocked(kysely.selectFrom).mockReturnValue({
      select: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          executeTakeFirst: mockExecuteTakeFirst,
        }),
      }),
    } as never)

    const values = {
      email: "new@example.com",
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

    const result = await registerUser(values, context)

    // Kysely should have been called to check for existing profile
    expect(kysely.selectFrom).toHaveBeenCalledWith("profiles")

    // signUp should have been called because no existing profile was found
    expect(mockSignUp).toHaveBeenCalled()
    expect(result.success).toBe(true)
  })
})
