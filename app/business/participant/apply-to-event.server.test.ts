import { describe, expect, it, vi, beforeEach, type Mock } from "vitest"
import { applyToEvent } from "./apply-to-event.server"
import type { z } from "zod"
import type { userContextSchema } from "../common"

vi.mock("./send-application-mail.server", () => ({
  sendApplicationMail: vi.fn(),
}))

vi.mock("~/lib/supabase/db.server", () => ({
  db: {
    selectFrom: vi.fn(),
  },
}))

import { sendApplicationMail } from "./send-application-mail.server"
import { db } from "~/lib/supabase/db.server"

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
      // Mock Kysely query chain - selectAll returns full event
      const mockExecuteTakeFirst = vi.fn().mockResolvedValue(mockEvent)
      const mockWhere = vi.fn(() => ({
        executeTakeFirst: mockExecuteTakeFirst,
      }))
      const mockSelectAll = vi.fn(() => ({
        where: mockWhere,
      }))
      vi.mocked(db.selectFrom).mockReturnValue({
        selectAll: mockSelectAll,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)

      // Only participant check needed — no second event query
      mockSingle.mockResolvedValueOnce({ data: null, error: null })
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
  })

  describe("registration closed scenarios", () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it("should return error when event status is 'Registration Closed'", async () => {
      const mockExecuteTakeFirst = vi.fn().mockResolvedValue({
        ...mockEvent,
        event_status: "Registration Closed",
      })
      const mockWhere = vi.fn(() => ({
        executeTakeFirst: mockExecuteTakeFirst,
      }))
      const mockSelectAll = vi.fn(() => ({
        where: mockWhere,
      }))
      vi.mocked(db.selectFrom).mockReturnValue({
        selectAll: mockSelectAll,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)

      const context = createContext()
      const result = await applyToEvent(validValues, context)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.errors).toHaveLength(1)
        expect(result.errors[0].message).toBe(
          "Inscrições encerradas! Este evento atingiu o limite de participantes.",
        )
      }

      expect(db.selectFrom).toHaveBeenCalledWith("events")
      expect(mockSelectAll).toHaveBeenCalled()
      expect(mockWhere).toHaveBeenCalledWith("id", "=", "event-123")
    })

    it("should return error when event does not exist", async () => {
      const mockExecuteTakeFirst = vi.fn().mockResolvedValue(null)
      const mockWhere = vi.fn(() => ({
        executeTakeFirst: mockExecuteTakeFirst,
      }))
      const mockSelectAll = vi.fn(() => ({
        where: mockWhere,
      }))
      vi.mocked(db.selectFrom).mockReturnValue({
        selectAll: mockSelectAll,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)

      const context = createContext()
      const result = await applyToEvent(validValues, context)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.errors).toHaveLength(1)
        expect(result.errors[0].message).toBe("Evento não encontrado.")
      }

      expect(db.selectFrom).toHaveBeenCalledWith("events")
      expect(mockSelectAll).toHaveBeenCalled()
      expect(mockWhere).toHaveBeenCalledWith("id", "=", "event-123")
    })

    it("should allow application when event status is 'Registration Open'", async () => {
      const mockExecuteTakeFirst = vi.fn().mockResolvedValue(mockEvent)
      const mockWhere = vi.fn(() => ({
        executeTakeFirst: mockExecuteTakeFirst,
      }))
      const mockSelectAll = vi.fn(() => ({
        where: mockWhere,
      }))
      vi.mocked(db.selectFrom).mockReturnValue({
        selectAll: mockSelectAll,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)

      // Only participant check needed
      mockSingle.mockResolvedValueOnce({ data: null, error: null })
      mockUpsert.mockResolvedValueOnce({ error: null })

      vi.mocked(sendApplicationMail).mockResolvedValue({ emailSent: true })

      const context = createContext()
      const result = await applyToEvent(validValues, context)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.emailSent).toBe(true)
      }
    })
  })
})
