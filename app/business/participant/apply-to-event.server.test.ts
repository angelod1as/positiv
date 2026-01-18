import { describe, expect, it, vi, beforeEach, type Mock } from "vitest"
import { applyToEvent } from "./apply-to-event.server"
import type { z } from "zod"
import type { userContextSchema } from "../common"

vi.mock("./send-application-mail.server", () => ({
  sendApplicationMail: vi.fn(),
}))

import { sendApplicationMail } from "./send-application-mail.server"

describe("applyToEvent", () => {
  let mockFrom: Mock
  let mockUpsert: Mock
  let mockSelect: Mock
  let mockEq: Mock
  let mockSingle: Mock

  beforeEach(() => {
    vi.clearAllMocks()

    mockSingle = vi.fn()
    mockEq = vi.fn(() => ({ single: mockSingle, eq: mockEq }))
    mockSelect = vi.fn(() => ({ eq: mockEq }))
    mockUpsert = vi.fn(() => Promise.resolve({ error: null }))
    mockFrom = vi.fn((table: string) => {
      if (table === "event_participants") {
        return {
          select: mockSelect,
          upsert: mockUpsert,
        }
      }
      if (table === "events") {
        return {
          select: mockSelect,
        }
      }
      return { select: mockSelect, upsert: mockUpsert }
    })
  })

  const createContext = (
    overrides?: Partial<z.infer<typeof userContextSchema>>,
  ) => ({
    supabase: { from: mockFrom } as unknown as z.infer<
      typeof userContextSchema
    >["supabase"],
    supabaseHeaders: new Headers(),
    currentUser: { id: "user-123", email: "test@example.com" },
    currentProfile: {
      id: "profile-123",
      email: "test@example.com",
      full_name: "Test User",
      basic_data_filled: true,
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
    isProdInDev: false,
    host: "localhost",
    ...overrides,
  })

  const validValues = {
    eventId: "event-123",
    applicationDate: new Date("2025-01-15"),
    referrals: "",
    referred: "ninguém",
    companions: "",
    bond: "Posso ir sozinhe." as const,
    notes: "",
  }

  const mockEvent = {
    id: "event-123",
    title: "Test Event",
    emoji: "🎉",
    description: "Test description",
    time_event_start: "2025-02-01T18:00:00Z",
    time_event_end: "2025-02-01T23:00:00Z",
    time_application_start: "2025-01-15T00:00:00Z",
    time_group_start: null,
    time_group_end: null,
    time_payment_start: null,
    time_payment_end: null,
    location: "Test Location",
    ticket_price: null,
    event_status: "Registration Open",
  }

  describe("email sending scenarios", () => {
    beforeEach(() => {
      mockSingle
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: mockEvent, error: null })
    })

    it("should return emailSent: true when email sends successfully", async () => {
      vi.mocked(sendApplicationMail).mockResolvedValue({ emailSent: true })

      const context = createContext()
      const result = await applyToEvent(validValues, context)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.emailSent).toBe(true)
      }
      expect(sendApplicationMail).toHaveBeenCalledWith({
        profile: context.currentProfile,
        event: mockEvent,
      })
    })

    it("should return emailSent: false when email fails", async () => {
      vi.mocked(sendApplicationMail).mockResolvedValue({ emailSent: false })

      const context = createContext()
      const result = await applyToEvent(validValues, context)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.emailSent).toBe(false)
      }
    })

    it("should return emailSent: false when profile has no email", async () => {
      const context = createContext({
        currentProfile: {
          id: "profile-123",
          email: null,
          full_name: "Test User",
          basic_data_filled: true,
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

      const result = await applyToEvent(validValues, context)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.emailSent).toBe(false)
      }
      expect(sendApplicationMail).not.toHaveBeenCalled()
    })

    it("should return emailSent: false and log error when event not found", async () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {})

      mockSingle
        .mockReset()
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: null, error: null })

      const context = createContext()
      const result = await applyToEvent(validValues, context)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.emailSent).toBe(false)
      }
      expect(sendApplicationMail).not.toHaveBeenCalled()
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Event not found for email sending",
        { eventId: "event-123" },
      )

      consoleErrorSpy.mockRestore()
    })
  })
})
