import { describe, expect, it, vi, beforeEach, type Mock } from "vitest"
import { agreeToTerms } from "./agree-to-terms.server"
import type { z } from "zod"
import type { contextSchema } from "../auth/auth-schemas"

vi.mock("../newsletter/email-preferences.server", () => ({
  recordEmailPreferences: vi.fn(),
  mirrorEmailPreferences: vi.fn(),
}))

vi.mock("~/lib/logger/logger.server", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock("~/lib/supabase/db.server", () => ({
  db: {
    selectFrom: vi.fn(),
    updateTable: vi.fn(),
    insertInto: vi.fn(),
  },
}))

import {
  mirrorEmailPreferences,
  recordEmailPreferences,
} from "../newsletter/email-preferences.server"
import { db } from "~/lib/supabase/db.server"
import { logger } from "~/lib/logger/logger.server"

const ALL_YES = {
  agree: true,
  registrationAlerts: true,
  newsletter: true,
  marketing: true,
}

const REFUSED = {
  agree: true,
  registrationAlerts: false,
  newsletter: false,
  marketing: false,
}

const CHOICES_REFUSED = {
  registrationAlerts: false,
  newsletter: false,
  marketing: false,
}

const existingProfile = (basicDataFilled: boolean) => ({
  id: "profile-123",
  email: "test@example.com",
  full_name: null,
  basic_data_filled: basicDataFilled,
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
})

describe("agreeToTerms", () => {
  let mockValues: Mock
  let mockInsertTakeFirst: Mock

  const mockKyselySelectReturning = (result: { id: string } | undefined) => {
    ;(db.selectFrom as unknown as Mock).mockReturnValue({
      select: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            executeTakeFirst: vi.fn().mockResolvedValue(result),
          }),
        }),
      }),
    } as never)
  }

  const mockKyselyUpdateReturning = (result: { id: string } | undefined) => {
    ;(db.updateTable as unknown as Mock).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockReturnValue({
              executeTakeFirst: vi.fn().mockResolvedValue(result),
            }),
          }),
        }),
      }),
    } as never)
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockInsertTakeFirst = vi.fn(() => Promise.resolve({ id: "new-profile-123" }))
    mockValues = vi.fn(() => ({
      returning: vi.fn(() => ({ executeTakeFirst: mockInsertTakeFirst })),
    }))
    ;(db.insertInto as unknown as Mock).mockReturnValue({ values: mockValues })

    // Default: no orphan found → INSERT path
    mockKyselySelectReturning(undefined)
    // Default: update succeeds (used in orphan-linking tests)
    mockKyselyUpdateReturning({ id: "orphan-profile-456" })

    vi.mocked(recordEmailPreferences).mockResolvedValue({
      success: true,
      data: 42,
      errors: [],
    })
    vi.mocked(mirrorEmailPreferences).mockResolvedValue({
      success: true,
      data: { bounced: false },
      errors: [],
    })
  })

  const createContext = (overrides?: Partial<z.infer<typeof contextSchema>>) => ({
    supabase: {} as z.infer<typeof contextSchema>["supabase"],
    supabaseHeaders: new Headers(),
    currentUser: { id: "user-123", email: "test@example.com" },
    currentProfile: null,
    isProdInDev: false,
    host: "localhost",
    ...overrides,
  })

  it("should create a new profile and record its email choices as onboarding", async () => {
    const context = createContext({ currentProfile: null })

    const values = ALL_YES

    await agreeToTerms(values, context)

    expect(db.insertInto).toHaveBeenCalledWith("profiles")
    expect(mockValues).toHaveBeenCalledWith({
      user_id: "user-123",
      email: "test@example.com",
    })
    expect(recordEmailPreferences).toHaveBeenCalledWith(
      "new-profile-123",
      { registrationAlerts: true, newsletter: true, marketing: true },
      "onboarding_auto",
    )
    expect(mirrorEmailPreferences).toHaveBeenCalledWith(
      "new-profile-123",
      42,
      { registrationAlerts: true, newsletter: true, marketing: true },
    )
  })

  it("should link orphan profile when orphan profile exists for user email", async () => {
    mockKyselySelectReturning({ id: "orphan-profile-456" })

    const context = createContext({ currentProfile: null })
    const values = REFUSED

    await agreeToTerms(values, context)

    expect(db.insertInto).not.toHaveBeenCalled()
    expect(db.updateTable).toHaveBeenCalledWith("profiles")
    expect(recordEmailPreferences).toHaveBeenCalledWith(
      "orphan-profile-456",
      CHOICES_REFUSED,
      "onboarding_auto",
    )
  })

  it("should throw error when orphan profile is claimed between SELECT and UPDATE (TOCTOU)", async () => {
    mockKyselySelectReturning({ id: "orphan-profile-456" })
    mockKyselyUpdateReturning(undefined) // 0 rows updated — race condition

    const context = createContext({ currentProfile: null })
    const values = REFUSED

    const result = await agreeToTerms(values, context)

    expect(result).toMatchObject({
      errors: [{ message: "Problema ao vincular perfil" }],
    })
    expect(db.insertInto).not.toHaveBeenCalled()
  })

  it("should record a refusal for a profile that had nothing on record", async () => {
    const context = createContext({ currentProfile: existingProfile(false) })

    const result = await agreeToTerms(REFUSED, context)

    expect(result).toMatchObject({ success: true })
    expect(db.insertInto).not.toHaveBeenCalled()
    expect(recordEmailPreferences).toHaveBeenCalledWith(
      "profile-123",
      CHOICES_REFUSED,
      "onboarding_auto",
    )
  })

  it("should record the choices as a terms change once the basic data is filled", async () => {
    const context = createContext({ currentProfile: existingProfile(true) })

    await agreeToTerms(ALL_YES, context)

    expect(recordEmailPreferences).toHaveBeenCalledWith(
      "profile-123",
      { registrationAlerts: true, newsletter: true, marketing: true },
      "terms_and_conditions",
    )
  })

  it("should return error when user is not authenticated", async () => {
    const context = createContext({
      currentUser: null,
      currentProfile: null,
    })

    const values = ALL_YES

    const result = await agreeToTerms(values, context)

    // composable-functions catches the error and returns it in the result
    expect(result).toBeDefined()
    if ('errors' in result && result.errors) {
      expect(result.errors[0].message).toBe("Usuário não autenticado")
    }
    expect(db.insertInto).not.toHaveBeenCalled()
  })

  it("should return error when the insert fails", async () => {
    const cause = new Error("Database error")
    mockInsertTakeFirst.mockRejectedValue(cause)
    const context = createContext({ currentProfile: null })

    const values = ALL_YES

    const result = await agreeToTerms(values, context)

    expect(db.insertInto).toHaveBeenCalledWith("profiles")
    expect(result).toMatchObject({
      errors: [{ message: "Problema ao criar perfil" }],
    })
    expect(logger.error).toHaveBeenCalledWith("Could not create the profile", {
      userId: "user-123",
      error: cause,
    })
  })

  it("should fail when the choices cannot be recorded on the site", async () => {
    vi.mocked(recordEmailPreferences).mockResolvedValueOnce({
      success: false,
      errors: [new Error("connection refused")],
    })
    const context = createContext({ currentProfile: existingProfile(false) })

    const result = await agreeToTerms(REFUSED, context)

    expect(result).toMatchObject({ success: false })
    expect(result.success ? [] : result.errors[0].message).toBe(
      "connection refused",
    )
    expect(mirrorEmailPreferences).not.toHaveBeenCalled()
  })

  it("should succeed with a warning when Listmonk does not take the choices", async () => {
    vi.mocked(mirrorEmailPreferences).mockResolvedValueOnce({
      success: false,
      errors: [new Error("Listmonk down")],
    })
    const context = createContext({ currentProfile: existingProfile(false) })

    const result = await agreeToTerms(ALL_YES, context)

    expect(result).toMatchObject({
      success: true,
      data: { newsletterSubscriptionError: expect.any(String) },
    })
    expect(logger.error).toHaveBeenCalled()
  })
})
