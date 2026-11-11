import { describe, expect, it, vi, beforeEach, type Mock } from "vitest"
import { applyToEvent } from "./apply-to-event.server"
import type { z } from "zod"
import type { userContextSchema } from "../auth/auth-schemas"

vi.mock("./send-application-mail.server", () => ({
  sendApplicationMail: vi.fn(),
}))

vi.mock("~/lib/logger/logger.server", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock("~/lib/supabase/db.server", () => ({
  db: {
    selectFrom: vi.fn(),
    transaction: vi.fn(),
  },
}))

// A closed event asks the database whether the applicant holds an invite, and
// these cases are about the applicant who does not.
vi.mock("../event/event-invite.server", () => ({
  findValidInvite: vi.fn().mockResolvedValue(undefined),
  markInviteUsed: vi.fn(),
}))

import { sendApplicationMail } from "./send-application-mail.server"
import { db } from "~/lib/supabase/db.server"
import { findValidInvite } from "../event/event-invite.server"
import { logger } from "~/lib/logger/logger.server"
import { participantCopy } from "~/copy/participant"

describe("applyToEvent", () => {
  let mockValues: Mock
  let mockDoUpdateSet: Mock

  beforeEach(() => {
    vi.clearAllMocks()

    // The transaction runs its callback against a fake whose insert records
    // the row it was handed, and what a re-apply would overwrite it with.
    mockDoUpdateSet = vi.fn()
    mockValues = vi.fn(() => ({
      onConflict: vi.fn((build: (oc: unknown) => unknown) => {
        build({ columns: () => ({ doUpdateSet: mockDoUpdateSet }) })
        return { execute: vi.fn().mockResolvedValue([]) }
      }),
    }))
    const trx = { insertInto: vi.fn(() => ({ values: mockValues })) }
    vi.mocked(db.transaction).mockReturnValue({
      execute: (run: (trx: unknown) => Promise<unknown>) => run(trx),
    } as never)
  })

  const createContext = (
    overrides?: Partial<z.infer<typeof userContextSchema>>,
  ) => ({
    supabase: {} as z.infer<typeof userContextSchema>["supabase"],
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

    it("should not send the email when the caller opted out", async () => {
      vi.mocked(sendApplicationMail).mockResolvedValue({ emailSent: true })

      const result = await applyToEvent(
        { ...validValues, skipEmail: true },
        createContext(),
      )

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.emailSent).toBe(false)
      }
      expect(sendApplicationMail).not.toHaveBeenCalled()
    })

    it("should clear what a previous cancellation left", async () => {
      vi.mocked(sendApplicationMail).mockResolvedValue({ emailSent: true })

      await applyToEvent(validValues, createContext())

      expect(mockValues.mock.calls[0][0]).toMatchObject({
        cancellation_date: null,
        cancellation_reason: null,
      })
    })

    it("should clear what a previous cancellation left when re-applying", async () => {
      vi.mocked(sendApplicationMail).mockResolvedValue({ emailSent: true })

      await applyToEvent(validValues, createContext())

      expect(mockDoUpdateSet.mock.calls[0][0]).toMatchObject({
        is_user_applied: true,
        cancellation_date: null,
        cancellation_reason: null,
      })
    })

    it("logs why the application could not be written", async () => {
      const cause = { code: "08006", message: "connection failure" }
      mockValues.mockReturnValue({
        onConflict: vi.fn(() => ({ execute: vi.fn().mockRejectedValue(cause) })),
      })

      const result = await applyToEvent(validValues, createContext())

      expect(result).toMatchObject({
        errors: [{ message: participantCopy.application.upsertFailed }],
      })
      expect(logger.error).toHaveBeenCalledWith(
        "Could not write the application",
        { eventId: validValues.eventId, error: cause },
      )
    })

    it("should keep the opt-out flag out of the participant row", async () => {
      vi.mocked(sendApplicationMail).mockResolvedValue({ emailSent: true })

      await applyToEvent({ ...validValues, skipEmail: true }, createContext())

      expect(mockValues).toHaveBeenCalledTimes(1)
      expect(mockValues.mock.calls[0][0]).not.toHaveProperty("skipEmail")
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

  describe("spot type", () => {
    beforeEach(() => {
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
      vi.mocked(sendApplicationMail).mockResolvedValue({ emailSent: true })
    })

    const contextWith = (permissions: string[]) => {
      const context = createContext()
      return {
        ...context,
        currentProfile: { ...context.currentProfile, permissions },
      }
    }

    it("writes a staff spot for whoever may apply as staff", async () => {
      await applyToEvent(validValues, contextWith(["events.apply_as_staff"]))

      expect(mockValues.mock.calls[0][0]).toMatchObject({
        spot_type: "staff",
      })
    })

    // The column defaults to regular, and a returning applicant keeps the spot
    // an admin gave them.
    it("leaves the spot type alone for everybody else", async () => {
      await applyToEvent(validValues, contextWith(["events.apply_direct"]))

      expect(mockValues.mock.calls[0][0]).not.toHaveProperty("spot_type")
    })

    it("ignores a spot type sent along with the answers", async () => {
      await applyToEvent(
        { ...validValues, spot_type: "staff" } as typeof validValues,
        contextWith([]),
      )

      expect(mockValues.mock.calls[0][0]).not.toHaveProperty("spot_type")
    })
  })

  describe("events that take no applications", () => {
    beforeEach(() => {
      vi.mocked(sendApplicationMail).mockResolvedValue({ emailSent: true })
    })

    const applicants = [
      ["a regular user", []],
      ["whoever may apply as staff", ["events.apply_as_staff"]],
    ] as const

    describe.each(["Draft", "Scheduled", "Cancelled", "Completed"])(
      "%s",
      (status) => {
        it.each(applicants)(
          "refuses %s and writes nothing",
          async (_, permissions) => {
            vi.mocked(db.selectFrom).mockReturnValue({
              selectAll: vi.fn(() => ({
                where: vi.fn(() => ({
                  executeTakeFirst: vi
                    .fn()
                    .mockResolvedValue({ ...mockEvent, event_status: status }),
                })),
              })),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any)

            const context = createContext()
            const result = await applyToEvent(validValues, {
              ...context,
              currentProfile: {
                ...context.currentProfile,
                permissions: [...permissions],
              },
            })

            expect(result.success).toBe(false)
            if (!result.success) {
              expect(result.errors[0].message).toBe(
                "Este evento não está recebendo candidaturas.",
              )
            }
            expect(findValidInvite).not.toHaveBeenCalled()
            expect(mockValues).not.toHaveBeenCalled()
            expect(sendApplicationMail).not.toHaveBeenCalled()
          },
        )
      },
    )
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
          "Candidaturas encerradas! Este evento atingiu o limite de participantes.",
        )
      }

      expect(db.selectFrom).toHaveBeenCalledWith("events")
      expect(mockSelectAll).toHaveBeenCalled()
      expect(mockWhere).toHaveBeenCalledWith("id", "=", "event-123")
    })

    it("says the application failed, not what the database said, when the invite read fails", async () => {
      vi.mocked(db.selectFrom).mockReturnValue({
        selectAll: () => ({
          where: () => ({
            executeTakeFirst: async () => ({
              ...mockEvent,
              event_status: "Registration Closed",
            }),
          }),
        }),
      } as never)
      const cause = new Error("canceling statement due to lock timeout")
      vi.mocked(findValidInvite).mockRejectedValueOnce(cause)

      const result = await applyToEvent(validValues, createContext())

      expect(result).toMatchObject({
        errors: [{ message: participantCopy.application.upsertFailed }],
      })
      expect(logger.error).toHaveBeenCalledWith(
        "Could not write the application",
        { eventId: validValues.eventId, error: cause },
      )
    })

    it("lets whoever may apply as staff in without an invite", async () => {
      const mockExecuteTakeFirst = vi.fn().mockResolvedValue({
        ...mockEvent,
        event_status: "Registration Closed",
      })
      vi.mocked(db.selectFrom).mockReturnValue({
        selectAll: vi.fn(() => ({
          where: vi.fn(() => ({ executeTakeFirst: mockExecuteTakeFirst })),
        })),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)

      const context = createContext()
      const result = await applyToEvent(validValues, {
        ...context,
        currentProfile: {
          ...context.currentProfile,
          permissions: ["events.apply_as_staff"],
        },
      })

      expect(result.success).toBe(true)
      expect(findValidInvite).not.toHaveBeenCalled()
      expect(mockValues.mock.calls[0][0]).toMatchObject({
        spot_type: "staff",
      })
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
