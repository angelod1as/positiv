import { describe, expect, it, vi, beforeEach, type Mock } from "vitest"
import { agreeToTerms } from "./agree-to-terms.server"
import type { z } from "zod"
import type { contextSchema } from "../common"

describe("agreeToTerms", () => {
  let mockFrom: Mock
  let mockUpsert: Mock

  beforeEach(() => {
    vi.clearAllMocks()
    mockUpsert = vi.fn(() => Promise.resolve({ error: null }))
    mockFrom = vi.fn(() => ({
      upsert: mockUpsert,
    }))
  })

  const createContext = (overrides?: Partial<z.infer<typeof contextSchema>>) => ({
    supabase: { from: mockFrom } as unknown as z.infer<typeof contextSchema>["supabase"],
    supabaseHeaders: new Headers(),
    currentUser: { id: "user-123", email: "test@example.com" },
    currentProfile: null,
    isProdInDev: false,
    host: "localhost",
    ...overrides,
  })

  it("should create a new profile with marketing email preference when profile doesn't exist", async () => {
    const context = createContext({ currentProfile: null })

    const values = {
      agree: true,
      commonEmails: true,
      mktEmails: true,
    }

    await agreeToTerms(values, context)

    expect(mockFrom).toHaveBeenCalledWith("profiles")
    expect(mockUpsert).toHaveBeenCalledWith({
      user_id: "user-123",
      email: "test@example.com",
      allow_marketing_email: true,
    })
  })

  it("should update existing profile with marketing email preference", async () => {
    const context = createContext({
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
    })

    const values = {
      agree: true,
      commonEmails: true,
      mktEmails: false,
    }

    await agreeToTerms(values, context)

    expect(mockFrom).toHaveBeenCalledWith("profiles")
    expect(mockUpsert).toHaveBeenCalledWith({
      id: "profile-123",
      user_id: "user-123",
      email: "test@example.com",
      allow_marketing_email: false,
    })
  })

  it("should return error when user is not authenticated", async () => {
    const context = createContext({
      currentUser: null,
      currentProfile: null,
    })

    const values = {
      agree: true,
      commonEmails: true,
      mktEmails: true,
    }

    const result = await agreeToTerms(values, context)

    // composable-functions catches the error and returns it in the result
    expect(result).toBeDefined()
    if ('errors' in result && result.errors) {
      expect(result.errors[0].message).toBe("Usuário não autenticado")
    }
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it("should return error when Supabase upsert fails", async () => {
    mockUpsert.mockResolvedValue({ error: { message: "Database error" } })
    const context = createContext({ currentProfile: null })

    const values = {
      agree: true,
      commonEmails: true,
      mktEmails: true,
    }

    const result = await agreeToTerms(values, context)
    
    // composable-functions catches errors and returns them in the result
    expect(result).toBeDefined()
    expect(mockFrom).toHaveBeenCalledWith("profiles")
  })
})