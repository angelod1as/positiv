import { describe, expect, it, vi, beforeEach } from "vitest"

vi.mock("~/lib/features.server", () => ({
  isPaymentSystemEnabled: vi.fn(),
}))

vi.mock("~/env.server", () => ({
  env: vi.fn(),
}))

vi.mock("~/integrations/asaas/client.server", () => ({
  getOrCreateAsaasCustomer: vi.fn(),
}))

vi.mock("~/business/email/send-email", () => ({
  sendEmail: vi.fn(),
}))

vi.mock("~/business/email/format-payment-link-mail", () => ({
  formatPaymentLinkMail: vi.fn(),
}))

vi.mock("~/business/email/templates/payment-link-email.template", () => ({
  getPaymentLinkEmailSubject: vi.fn(),
}))

vi.mock("~/kysely-db", () => ({
  kyselyDb: {
    selectFrom: vi.fn(),
    updateTable: vi.fn(),
  },
}))

vi.mock("~/lib/logger/logger.server", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

import { isPaymentSystemEnabled } from "~/lib/features.server"
import { env } from "~/env.server"
import { kyselyDb as _kyselyDb } from "~/kysely-db"

const kyselyDb = _kyselyDb as unknown as {
  selectFrom: ReturnType<typeof vi.fn>
  updateTable: ReturnType<typeof vi.fn>
}
import { getOrCreateAsaasCustomer } from "~/integrations/asaas/client.server"
import { sendEmail } from "~/business/email/send-email"
import { formatPaymentLinkMail } from "~/business/email/format-payment-link-mail"
import { getPaymentLinkEmailSubject } from "~/business/email/templates/payment-link-email.template"
import { logger } from "~/lib/logger/logger.server"
import { generatePaymentLink } from "./generate-payment-link.server"

const mockEnv = {
  appUrl: "https://positiv.com.br",
  enablePaymentSystem: true,
}

function setupDefaultMocks() {
  vi.mocked(isPaymentSystemEnabled).mockReturnValue(true)
  vi.mocked(env).mockReturnValue(mockEnv as ReturnType<typeof env>)
}

function createMockSelectChain(result: unknown) {
  return {
    innerJoin: vi.fn().mockReturnValue({
      innerJoin: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              executeTakeFirst: vi.fn().mockResolvedValue(result),
            }),
          }),
        }),
      }),
    }),
  }
}

function createMockPaymentTransactionsSelect(result: unknown) {
  return {
    select: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          executeTakeFirst: vi.fn().mockResolvedValue(result),
        }),
      }),
    }),
  }
}

const validParticipantRow = {
  participant_id: "part-1",
  profile_id: "prof-1",
  event_id: "evt-1",
  spot_type: "regular",
  has_paid: false,
  full_name: "Test User",
  social_name: null as string | null,
  email: "test@example.com",
  cpf: "123.456.789-00",
  event_title: "Test Event",
  event_emoji: "🎉",
  payment_link_token: null as string | null,
  payment_link_expires_at: null as string | null,
}

function createMockUpdateChain() {
  const mockExecute = vi.fn().mockResolvedValue(undefined)
  const mockWhere = vi.fn().mockReturnValue({ execute: mockExecute })
  const mockSet = vi.fn().mockReturnValue({ where: mockWhere })
  return { set: mockSet, _mockSet: mockSet, _mockExecute: mockExecute }
}

function setupHappyPathMocks(options?: { participantRow?: typeof validParticipantRow }) {
  const row = options?.participantRow ?? validParticipantRow

  kyselyDb.selectFrom
    .mockReturnValueOnce(createMockSelectChain(row) as never)
    .mockReturnValueOnce(
      createMockPaymentTransactionsSelect(undefined) as never,
    )

  vi.mocked(getOrCreateAsaasCustomer).mockResolvedValue({
    id: "cus_123",
    object: "customer",
    dateCreated: "2025-01-01",
    name: "Test User",
    email: "test@example.com",
    phone: null,
    mobilePhone: null,
    cpfCnpj: "12345678900",
    personType: "FISICA",
    deleted: false,
    externalReference: null,
    notificationDisabled: true,
  })

  const updateChain = createMockUpdateChain()
  kyselyDb.updateTable.mockReturnValue(updateChain)

  vi.mocked(formatPaymentLinkMail).mockResolvedValue({
    html: "<p>Payment link</p>",
    text: "Payment link",
  })
  vi.mocked(getPaymentLinkEmailSubject).mockReturnValue("Payment Subject")
  vi.mocked(sendEmail).mockResolvedValue({
    success: true,
    data: undefined,
    errors: [],
  })

  return { updateChain }
}

describe("generatePaymentLink", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMocks()
  })

  describe("validation", () => {
    it("throws when payment system is disabled", async () => {
      vi.mocked(isPaymentSystemEnabled).mockReturnValue(false)

      await expect(
        generatePaymentLink({
          profileId: "prof-1",
          eventId: "evt-1",
          adminProfileId: "admin-1",
        }),
      ).rejects.toThrow("Payment system is not enabled")
    })

    it("throws when APP_URL is not configured", async () => {
      vi.mocked(env).mockReturnValue({
        ...mockEnv,
        appUrl: undefined,
      } as ReturnType<typeof env>)

      await expect(
        generatePaymentLink({
          profileId: "prof-1",
          eventId: "evt-1",
          adminProfileId: "admin-1",
        }),
      ).rejects.toThrow("APP_URL is not configured")
    })

    it("throws when participant is not found", async () => {
      kyselyDb.selectFrom.mockReturnValue(
        createMockSelectChain(undefined) as never,
      )

      await expect(
        generatePaymentLink({
          profileId: "prof-1",
          eventId: "evt-1",
          adminProfileId: "admin-1",
        }),
      ).rejects.toThrow("Participant not found")
    })

    it("throws when participant has non-regular spot type", async () => {
      kyselyDb.selectFrom.mockReturnValue(
        createMockSelectChain({
          ...validParticipantRow,
          spot_type: "social",
        }) as never,
      )

      await expect(
        generatePaymentLink({
          profileId: "prof-1",
          eventId: "evt-1",
          adminProfileId: "admin-1",
        }),
      ).rejects.toThrow("Only regular spot participants can generate payment links")
    })

    it("throws when participant has_paid is true", async () => {
      kyselyDb.selectFrom.mockReturnValue(
        createMockSelectChain({
          ...validParticipantRow,
          has_paid: true,
        }) as never,
      )

      await expect(
        generatePaymentLink({
          profileId: "prof-1",
          eventId: "evt-1",
          adminProfileId: "admin-1",
        }),
      ).rejects.toThrow("Participant is already marked as paid")
    })

    it("throws when participant already has a confirmed payment", async () => {
      kyselyDb.selectFrom
        .mockReturnValueOnce(createMockSelectChain(validParticipantRow) as never)
        .mockReturnValueOnce(
          createMockPaymentTransactionsSelect({ id: "tx-1" }) as never,
        )

      await expect(
        generatePaymentLink({
          profileId: "prof-1",
          eventId: "evt-1",
          adminProfileId: "admin-1",
        }),
      ).rejects.toThrow("Participant already has a confirmed payment")
    })

    it("throws when an unexpired payment link exists", async () => {
      kyselyDb.selectFrom
        .mockReturnValueOnce(
          createMockSelectChain({
            ...validParticipantRow,
            payment_link_token: "existing-token",
            payment_link_expires_at: new Date(
              Date.now() + 24 * 60 * 60 * 1000,
            ).toISOString(),
          }) as never,
        )
        .mockReturnValueOnce(
          createMockPaymentTransactionsSelect(undefined) as never,
        )

      await expect(
        generatePaymentLink({
          profileId: "prof-1",
          eventId: "evt-1",
          adminProfileId: "admin-1",
        }),
      ).rejects.toThrow("An unexpired payment link already exists")
    })

    it("throws when participant profile has no CPF", async () => {
      kyselyDb.selectFrom
        .mockReturnValueOnce(
          createMockSelectChain({
            ...validParticipantRow,
            cpf: null,
          }) as never,
        )
        .mockReturnValueOnce(
          createMockPaymentTransactionsSelect(undefined) as never,
        )

      await expect(
        generatePaymentLink({
          profileId: "prof-1",
          eventId: "evt-1",
          adminProfileId: "admin-1",
        }),
      ).rejects.toThrow("Participant profile must have a CPF")
    })

    it("throws when participant has no full_name", async () => {
      kyselyDb.selectFrom
        .mockReturnValueOnce(
          createMockSelectChain({
            ...validParticipantRow,
            full_name: null,
          }) as never,
        )
        .mockReturnValueOnce(
          createMockPaymentTransactionsSelect(undefined) as never,
        )

      await expect(
        generatePaymentLink({
          profileId: "prof-1",
          eventId: "evt-1",
          adminProfileId: "admin-1",
        }),
      ).rejects.toThrow("Participant profile must have a name")
    })

    it("throws when event has no title", async () => {
      kyselyDb.selectFrom
        .mockReturnValueOnce(
          createMockSelectChain({
            ...validParticipantRow,
            event_title: null,
          }) as never,
        )
        .mockReturnValueOnce(
          createMockPaymentTransactionsSelect(undefined) as never,
        )

      await expect(
        generatePaymentLink({
          profileId: "prof-1",
          eventId: "evt-1",
          adminProfileId: "admin-1",
        }),
      ).rejects.toThrow("Event must have a title")
    })

    it("allows regeneration when existing payment link is expired", async () => {
      const expiredRow = {
        ...validParticipantRow,
        payment_link_token: "expired-token",
        payment_link_expires_at: new Date(
          Date.now() - 24 * 60 * 60 * 1000,
        ).toISOString(),
      }

      setupHappyPathMocks({ participantRow: expiredRow })

      const result = await generatePaymentLink({
        profileId: "prof-1",
        eventId: "evt-1",
        adminProfileId: "admin-1",
      })

      expect(result.token).toBeDefined()
      expect(result.whatsappMessage).toBeDefined()
    })
  })

  describe("happy path", () => {
    it("calls getOrCreateAsaasCustomer with correct params", async () => {
      setupHappyPathMocks({
        participantRow: {
          ...validParticipantRow,
          social_name: "Display Name",
          cpf: "123.456.789-00",
          email: "test@example.com",
        },
      })

      await generatePaymentLink({
        profileId: "prof-1",
        eventId: "evt-1",
        adminProfileId: "admin-1",
      })

      expect(getOrCreateAsaasCustomer).toHaveBeenCalledWith({
        name: "Display Name",
        cpfCnpj: "12345678900",
        email: "test@example.com",
        notificationDisabled: true,
      })
    })

    it("uses full_name when social_name is null", async () => {
      setupHappyPathMocks({
        participantRow: {
          ...validParticipantRow,
          social_name: null,
          full_name: "Full Name",
        },
      })

      await generatePaymentLink({
        profileId: "prof-1",
        eventId: "evt-1",
        adminProfileId: "admin-1",
      })

      expect(getOrCreateAsaasCustomer).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Full Name" }),
      )
    })

    it("updates event_participants directly with token and expiry", async () => {
      const { updateChain } = setupHappyPathMocks()

      await generatePaymentLink({
        profileId: "prof-1",
        eventId: "evt-1",
        adminProfileId: "admin-1",
      })

      expect(kyselyDb.updateTable).toHaveBeenCalledWith("event_participants")
      expect(updateChain._mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_link_token: expect.any(String),
          payment_link_generated_at: expect.any(String),
          payment_link_expires_at: expect.any(String),
        }),
      )
    })

    it("does not use database transaction", async () => {
      setupHappyPathMocks()

      await generatePaymentLink({
        profileId: "prof-1",
        eventId: "evt-1",
        adminProfileId: "admin-1",
      })

      expect(kyselyDb.updateTable).toHaveBeenCalled()
      expect(kyselyDb).not.toHaveProperty("transaction")
    })

    it("calls sendEmail with formatted content", async () => {
      setupHappyPathMocks()

      await generatePaymentLink({
        profileId: "prof-1",
        eventId: "evt-1",
        adminProfileId: "admin-1",
      })

      expect(formatPaymentLinkMail).toHaveBeenCalled()
      expect(getPaymentLinkEmailSubject).toHaveBeenCalled()
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "test@example.com",
          subject: "Payment Subject",
          html: "<p>Payment link</p>",
          text: "Payment link",
        }),
      )
    })

    it("returns only token and whatsappMessage", async () => {
      setupHappyPathMocks()

      const result = await generatePaymentLink({
        profileId: "prof-1",
        eventId: "evt-1",
        adminProfileId: "admin-1",
      })

      expect(result.token).toBeDefined()
      expect(result.whatsappMessage).toBeDefined()
      expect(Object.keys(result)).toEqual(["token", "whatsappMessage"])
    })

    it("whatsapp message contains pix price and credit card info", async () => {
      setupHappyPathMocks()

      const result = await generatePaymentLink({
        profileId: "prof-1",
        eventId: "evt-1",
        adminProfileId: "admin-1",
      })

      expect(result.whatsappMessage).toContain("Test Event")
      expect(result.whatsappMessage).toContain("R$ 220,00")
      expect(result.whatsappMessage).toContain("6x")
      expect(result.whatsappMessage).toContain("positiv.com.br/payment/")
    })
  })

  describe("edge cases", () => {
    it("still returns result when sendEmail fails", async () => {
      setupHappyPathMocks()
      vi.mocked(sendEmail).mockResolvedValue({
        success: false,
        errors: [new Error("SMTP error")],
      })

      const result = await generatePaymentLink({
        profileId: "prof-1",
        eventId: "evt-1",
        adminProfileId: "admin-1",
      })

      expect(result.token).toBeDefined()
      expect(result.whatsappMessage).toBeDefined()
      expect(logger.error).toHaveBeenCalledWith(
        "Failed to send payment link email:",
        expect.any(Object),
      )
    })

    it("still returns result when email formatting throws", async () => {
      setupHappyPathMocks()
      vi.mocked(formatPaymentLinkMail).mockRejectedValue(new Error("Template error"))

      const result = await generatePaymentLink({
        profileId: "prof-1",
        eventId: "evt-1",
        adminProfileId: "admin-1",
      })

      expect(result.token).toBeDefined()
      expect(result.whatsappMessage).toBeDefined()
      expect(logger.error).toHaveBeenCalledWith(
        "Error sending payment link email:",
        expect.objectContaining({ error: expect.any(Error) }),
      )
    })
  })
})
