import { describe, expect, it, vi, beforeEach } from "vitest"
import { agreeToTerms } from "./agree-to-terms.server"
import type { z } from "zod"
import type { contextSchema } from "../common"

describe("agreeToTerms", () => {
  const mockSupabase = {
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
      upsert: vi.fn(() => Promise.resolve({ error: null })),
    })),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const baseContext: z.infer<typeof contextSchema> = {
    supabase: mockSupabase as any,
    supabaseHeaders: new Headers(),
    currentUser: { id: "user-123", email: "test@example.com" },
    currentProfile: null,
    isProdInDev: false,
    host: "localhost",
  }

  it("should create a new profile with marketing email preference when profile doesn't exist", async () => {
    const contextWithoutProfile = {
      ...baseContext,
      currentProfile: null,
    }

    const values = {
      agree: true,
      commonEmails: true,
      mktEmails: true,
    }

    const upsertSpy = vi.fn(() => Promise.resolve({ error: null }))
    mockSupabase.from.mockReturnValue({
      upsert: upsertSpy,
    })

    await agreeToTerms(values, contextWithoutProfile)

    expect(mockSupabase.from).toHaveBeenCalledWith("profiles")
    expect(upsertSpy).toHaveBeenCalledWith({
      user_id: "user-123",
      email: "test@example.com",
      allow_marketing_email: true,
    })
  })

  it("should update existing profile with marketing email preference", async () => {
    const contextWithProfile = {
      ...baseContext,
      currentProfile: {
        id: "profile-123",
        email: "test@example.com",
        full_name: null,
        basic_data_filled: false,
        social_name: null,
        pronouns: null,
        rg: null,
        cpf: null,
        phone: null,
        date_of_birth: null,
        gender: null,
        orientation: null,
        where_lives: null,
        how_came_to_us: null,
        rg_issuer: null,
        allow_marketing_email: false,
        created_at: "2025-01-01T00:00:00Z",
        is_admin: false,
      },
    }

    const values = {
      agree: true,
      commonEmails: true,
      mktEmails: false,
    }

    const upsertSpy = vi.fn(() => Promise.resolve({ error: null }))
    mockSupabase.from.mockReturnValue({
      upsert: upsertSpy,
    })

    await agreeToTerms(values, contextWithProfile)

    expect(mockSupabase.from).toHaveBeenCalledWith("profiles")
    expect(upsertSpy).toHaveBeenCalledWith({
      id: "profile-123",
      user_id: "user-123",
      email: "test@example.com",
      allow_marketing_email: false,
    })
  })

  it("should handle the case when user is not authenticated", async () => {
    const contextWithoutUser = {
      ...baseContext,
      currentUser: null,
      currentProfile: null,
    }

    const values = {
      agree: true,
      commonEmails: true,
      mktEmails: true,
    }

    const result = await agreeToTerms(values, contextWithoutUser)

    // composable-functions returns a Result object with success and data
    expect(result.success).toBe(true)
    expect(result.data).toBeUndefined()
    expect(mockSupabase.from).not.toHaveBeenCalled()
  })

  it("should return error when Supabase upsert fails", async () => {
    const context = {
      ...baseContext,
      currentProfile: null,
    }

    const values = {
      agree: true,
      commonEmails: true,
      mktEmails: true,
    }

    const upsertSpy = vi.fn(() =>
      Promise.resolve({ error: { message: "Database error" } }),
    )
    mockSupabase.from.mockReturnValue({
      upsert: upsertSpy,
    })

    const result = await agreeToTerms(values, context)
    
    // composable-functions catches errors and returns them in the result
    expect(result.success).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].message).toBe("Problema ao atualizar perfil")
  })
})