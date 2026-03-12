import { describe, expect, it, vi, beforeEach } from "vitest"

vi.mock("~/lib/features.server", () => ({
  isPaymentSystemEnabled: vi.fn(),
}))

vi.mock("~/env.server", () => ({
  env: vi.fn(),
}))

vi.mock("~/integrations/asaas/client.server", () => ({
  getOrCreateAsaasCustomer: vi.fn(),
  createPaymentCharge: vi.fn(),
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
    insertInto: vi.fn(),
    updateTable: vi.fn(),
    transaction: vi.fn(),
  },
}))

import { isPaymentSystemEnabled } from "~/lib/features.server"
import { env } from "~/env.server"
import { kyselyDb } from "~/kysely-db"
import { getOrCreateAsaasCustomer, createPaymentCharge } from "~/integrations/asaas/client.server"
import { sendEmail } from "~/business/email/send-email"
import { formatPaymentLinkMail } from "~/business/email/format-payment-link-mail"
import { getPaymentLinkEmailSubject } from "~/business/email/templates/payment-link-email.template"
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
  full_name: "Test User",
  social_name: null,
  email: "test@example.com",
  cpf: "123.456.789-00",
  event_title: "Test Event",
  event_emoji: "🎉",
  payment_link_token: null,
  payment_link_expires_at: null,
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
        })
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
        })
      ).rejects.toThrow("APP_URL is not configured")
    })

    it("throws when participant is not found", async () => {
      vi.mocked(kyselyDb.selectFrom).mockReturnValue(
        createMockSelectChain(undefined) as never
      )

      await expect(
        generatePaymentLink({
          profileId: "prof-1",
          eventId: "evt-1",
          adminProfileId: "admin-1",
        })
      ).rejects.toThrow("Participant not found")
    })

    it("throws when participant has non-regular spot type", async () => {
      vi.mocked(kyselyDb.selectFrom).mockReturnValue(
        createMockSelectChain({
          ...validParticipantRow,
          spot_type: "social",
        }) as never
      )

      await expect(
        generatePaymentLink({
          profileId: "prof-1",
          eventId: "evt-1",
          adminProfileId: "admin-1",
        })
      ).rejects.toThrow("Only regular spot participants can generate payment links")
    })

    it("throws when participant already has a confirmed payment", async () => {
      vi.mocked(kyselyDb.selectFrom)
        .mockReturnValueOnce(createMockSelectChain(validParticipantRow) as never)
        .mockReturnValueOnce(
          createMockPaymentTransactionsSelect({ id: "tx-1" }) as never
        )

      await expect(
        generatePaymentLink({
          profileId: "prof-1",
          eventId: "evt-1",
          adminProfileId: "admin-1",
        })
      ).rejects.toThrow("Participant already has a confirmed payment")
    })

    it("throws when an unexpired payment link exists", async () => {
      vi.mocked(kyselyDb.selectFrom)
        .mockReturnValueOnce(
          createMockSelectChain({
            ...validParticipantRow,
            payment_link_token: "existing-token",
            payment_link_expires_at: new Date(
              Date.now() + 24 * 60 * 60 * 1000
            ).toISOString(),
          }) as never
        )
        .mockReturnValueOnce(
          createMockPaymentTransactionsSelect(undefined) as never
        )

      await expect(
        generatePaymentLink({
          profileId: "prof-1",
          eventId: "evt-1",
          adminProfileId: "admin-1",
        })
      ).rejects.toThrow("An unexpired payment link already exists")
    })

    it("throws when participant profile has no CPF", async () => {
      vi.mocked(kyselyDb.selectFrom)
        .mockReturnValueOnce(
          createMockSelectChain({
            ...validParticipantRow,
            cpf: null,
          }) as never
        )
        .mockReturnValueOnce(
          createMockPaymentTransactionsSelect(undefined) as never
        )

      await expect(
        generatePaymentLink({
          profileId: "prof-1",
          eventId: "evt-1",
          adminProfileId: "admin-1",
        })
      ).rejects.toThrow("Participant profile must have a CPF")
    })

    it("allows regeneration when existing payment link is expired", async () => {
      const expiredRow = {
        ...validParticipantRow,
        payment_link_token: "expired-token",
        payment_link_expires_at: new Date(
          Date.now() - 24 * 60 * 60 * 1000
        ).toISOString(),
      }

      setupHappyPathMocks({ participantRow: expiredRow })

      const result = await generatePaymentLink({
        profileId: "prof-1",
        eventId: "evt-1",
        adminProfileId: "admin-1",
      })

      expect(result.token).toBeDefined()
      expect(result.pixInvoiceUrl).toBe(
        "https://sandbox.asaas.com/i/pix-invoice"
      )
      expect(result.creditInvoiceUrl).toBe(
        "https://sandbox.asaas.com/i/cc-invoice"
      )
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
        expect.objectContaining({ name: "Full Name" })
      )
    })

    it("calls createPaymentCharge twice with pix and credit_card", async () => {
      setupHappyPathMocks()

      const result = await generatePaymentLink({
        profileId: "prof-1",
        eventId: "evt-1",
        adminProfileId: "admin-1",
      })

      expect(createPaymentCharge).toHaveBeenCalledTimes(2)
      expect(createPaymentCharge).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentMethod: "pix",
          customer: "cus_123",
          externalReference: result.token,
        })
      )
      expect(createPaymentCharge).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentMethod: "credit_card",
          customer: "cus_123",
          externalReference: result.token,
        })
      )
    })

    it("inserts two payment_transactions via transaction", async () => {
      const mockTrx = setupHappyPathMocks()

      await generatePaymentLink({
        profileId: "prof-1",
        eventId: "evt-1",
        adminProfileId: "admin-1",
      })

      expect(mockTrx.insertInto).toHaveBeenCalledWith("payment_transactions")
    })

    it("updates event_participants with token and expiry via transaction", async () => {
      const mockTrx = setupHappyPathMocks()

      await generatePaymentLink({
        profileId: "prof-1",
        eventId: "evt-1",
        adminProfileId: "admin-1",
      })

      expect(mockTrx.updateTable).toHaveBeenCalledWith("event_participants")
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
        })
      )
    })

    it("returns token, invoice URLs, and whatsapp message", async () => {
      setupHappyPathMocks()

      const result = await generatePaymentLink({
        profileId: "prof-1",
        eventId: "evt-1",
        adminProfileId: "admin-1",
      })

      expect(result.token).toBeDefined()
      expect(result.pixInvoiceUrl).toBe("https://sandbox.asaas.com/i/pix-invoice")
      expect(result.creditInvoiceUrl).toBe("https://sandbox.asaas.com/i/cc-invoice")
      expect(result.whatsappMessage).toContain("Test Event")
      expect(result.whatsappMessage).toContain("Pix")
      expect(result.whatsappMessage).toContain("Cartão de crédito")
    })
  })

  describe("edge cases", () => {
    it("still returns result when sendEmail fails", async () => {
      setupHappyPathMocks()
      vi.mocked(sendEmail).mockResolvedValue({
        success: false,
        errors: [new Error("SMTP error")],
      })

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

      const result = await generatePaymentLink({
        profileId: "prof-1",
        eventId: "evt-1",
        adminProfileId: "admin-1",
      })

      expect(result.token).toBeDefined()
      expect(result.pixInvoiceUrl).toBe("https://sandbox.asaas.com/i/pix-invoice")
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it("still returns result when email formatting throws", async () => {
      setupHappyPathMocks()
      vi.mocked(formatPaymentLinkMail).mockRejectedValue(new Error("Template error"))

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

      const result = await generatePaymentLink({
        profileId: "prof-1",
        eventId: "evt-1",
        adminProfileId: "admin-1",
      })

      expect(result.token).toBeDefined()
      expect(result.pixInvoiceUrl).toBe("https://sandbox.asaas.com/i/pix-invoice")
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })
})

function setupHappyPathMocks(options?: { participantRow?: typeof validParticipantRow }) {
  const row = options?.participantRow ?? validParticipantRow

  vi.mocked(kyselyDb.selectFrom)
    .mockReturnValueOnce(createMockSelectChain(row) as never)
    .mockReturnValueOnce(
      createMockPaymentTransactionsSelect(undefined) as never
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

  const mockPayment = {
    object: "payment" as const,
    id: "pay_1",
    dateCreated: "2025-01-01",
    customer: "cus_123",
    subscription: null,
    installment: null,
    paymentLink: null,
    value: 220,
    netValue: 218,
    originalValue: null,
    interestValue: null,
    billingType: "PIX" as const,
    status: "PENDING" as const,
    dueDate: "2025-01-03",
    originalDueDate: "2025-01-03",
    paymentDate: null,
    clientPaymentDate: null,
    creditDate: null,
    estimatedCreditDate: null,
    description: null,
    externalReference: null,
    installmentNumber: null,
    invoiceUrl: "https://sandbox.asaas.com/i/pix-invoice",
    transactionReceiptUrl: null,
    deleted: false,
    anticipated: false,
    anticipable: false,
    bankSlipUrl: null,
    nossoNumero: null,
  }

  vi.mocked(createPaymentCharge)
    .mockResolvedValueOnce({
      ...mockPayment,
      invoiceUrl: "https://sandbox.asaas.com/i/pix-invoice",
    })
    .mockResolvedValueOnce({
      ...mockPayment,
      id: "pay_2",
      billingType: "CREDIT_CARD",
      value: 227,
      invoiceUrl: "https://sandbox.asaas.com/i/cc-invoice",
    })

  const mockTrx = {
    insertInto: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        execute: vi.fn().mockResolvedValue(undefined),
      }),
    }),
    updateTable: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            execute: vi.fn().mockResolvedValue(undefined),
          }),
        }),
      }),
    }),
  }
  vi.mocked(kyselyDb.transaction).mockReturnValue({
    execute: vi.fn().mockImplementation(async (cb) => cb(mockTrx)),
  } as never)

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

  return mockTrx
}
