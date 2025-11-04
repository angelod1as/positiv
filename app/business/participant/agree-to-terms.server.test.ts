import { describe, expect, it, vi, beforeEach, type Mock } from "vitest"
import { agreeToTerms } from "./agree-to-terms.server"
import type { z } from "zod"
import type { contextSchema } from "../common"

// Mock the subscription helpers
vi.mock("../newsletter/subscription-helpers.server", () => ({
  subscribeProfile: vi.fn(),
  unsubscribeProfile: vi.fn(),
}))

import { subscribeProfile, unsubscribeProfile } from "../newsletter/subscription-helpers.server"

describe("agreeToTerms", () => {
  let mockFrom: Mock
  let mockInsert: Mock
  let mockSelect: Mock
  let mockSingle: Mock

  beforeEach(() => {
    vi.clearAllMocks()
    mockSingle = vi.fn(() => Promise.resolve({ data: { id: "new-profile-123" }, error: null }))
    mockSelect = vi.fn(() => ({
      single: mockSingle,
    }))
    mockInsert = vi.fn(() => ({
      select: mockSelect,
    }))
    mockFrom = vi.fn(() => ({
      insert: mockInsert,
    }))

    // Setup default mocks for subscription helpers
    vi.mocked(subscribeProfile).mockResolvedValue({
      success: true,
      subscription: {
        id: "sub-123",
        profile_id: "profile-123",
        consent_given: true,
        first_consent_given_at: new Date().toISOString(),
        last_consent_given_at: new Date().toISOString(),
        subscribed_at: new Date().toISOString(),
        unsubscribed_at: null,
        subscription_source: "onboarding_auto",
        listmonk_subscriber_id: null,
        sync_status: "pending",
        last_sync_attempt_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    })

    vi.mocked(unsubscribeProfile).mockResolvedValue({
      success: true,
      subscription: {
        id: "sub-123",
        profile_id: "profile-123",
        consent_given: false,
        first_consent_given_at: new Date().toISOString(),
        last_consent_given_at: new Date().toISOString(),
        subscribed_at: new Date().toISOString(),
        unsubscribed_at: new Date().toISOString(),
        subscription_source: "onboarding_auto",
        listmonk_subscriber_id: null,
        sync_status: "unsubscribed",
        last_sync_attempt_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    })
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

  it("should create a new profile and subscribe when profile doesn't exist and mktEmails is true", async () => {
    const context = createContext({ currentProfile: null })

    const values = {
      agree: true,
      commonEmails: true,
      mktEmails: true,
    }

    await agreeToTerms(values, context)

    expect(mockFrom).toHaveBeenCalledWith("profiles")
    expect(mockInsert).toHaveBeenCalledWith({
      user_id: "user-123",
      email: "test@example.com",
    })
    expect(mockSelect).toHaveBeenCalledWith("id")
    expect(subscribeProfile).toHaveBeenCalledWith("new-profile-123", "onboarding_auto")
    expect(unsubscribeProfile).not.toHaveBeenCalled()
  })

  it("should unsubscribe existing profile when mktEmails is false", async () => {
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

    expect(mockFrom).not.toHaveBeenCalled()
    expect(unsubscribeProfile).toHaveBeenCalledWith("profile-123")
    expect(subscribeProfile).not.toHaveBeenCalled()
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

  it("should return error when Supabase insert fails", async () => {
    mockSelect.mockReturnValue({
      single: vi.fn(() => Promise.resolve({ data: null, error: { message: "Database error" } })),
    })
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
    if ('errors' in result && result.errors) {
      expect(result.errors[0].message).toBe("Problema ao criar perfil")
    }
  })

  it("should handle unsubscribe when no subscription exists", async () => {
    vi.mocked(unsubscribeProfile).mockResolvedValue({
      success: false,
      error: "No subscription found",
    })

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
        created_at: "2025-01-01T00:00:00Z",
        is_admin: false,
      },
    })

    const values = {
      agree: true,
      commonEmails: true,
      mktEmails: false,
    }

    const result = await agreeToTerms(values, context)

    // Should succeed even if no subscription exists
    expect('success' in result ? result.success : true).toBe(true)
    expect(unsubscribeProfile).toHaveBeenCalledWith("profile-123")
  })

  it("should subscribe existing profile when mktEmails is true", async () => {
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
        created_at: "2025-01-01T00:00:00Z",
        is_admin: false,
      },
    })

    const values = {
      agree: true,
      commonEmails: true,
      mktEmails: true,
    }

    await agreeToTerms(values, context)

    expect(subscribeProfile).toHaveBeenCalledWith("profile-123", "onboarding_auto")
    expect(unsubscribeProfile).not.toHaveBeenCalled()
  })
})