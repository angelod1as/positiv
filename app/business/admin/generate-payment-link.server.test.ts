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
  deletePayment: vi.fn(),
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
import { kyselyDb } from "~/kysely-db"
import {
  getOrCreateAsaasCustomer,
  createPaymentCharge,
  deletePayment,
} from "~/integrations/asaas/client.server"
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

  const mockDeleteExecute = vi.fn().mockResolvedValue(undefined)
  const mockInsertExecute = vi.fn().mockResolvedValue(undefined)
  const mockUpdateExecute = vi.fn().mockResolvedValue(undefined)
  const mockInsertValues = vi.fn().mockReturnValue({
    execute: mockInsertExecute,
  })
  const mockUpdateSet = vi.fn().mockReturnValue({
    where: vi.fn().mockReturnValue({
      execute: mockUpdateExecute,
    }),
  })

  const mockTrx = {
    deleteFrom: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          execute: mockDeleteExecute,
        }),
      }),
    }),
    insertInto: vi.fn().mockReturnValue({
      values: mockInsertValues,
    }),
    updateTable: vi.fn().mockReturnValue({
      set: mockUpdateSet,
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
  vi.mocked(deletePayment).mockResolvedValue(undefined)

  return { mockTrx, mockInsertValues, mockUpdateSet }
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

    it("throws when participant has_paid is true", async () => {
      vi.mocked(kyselyDb.selectFrom).mockReturnValue(
        createMockSelectChain({
          ...validParticipantRow,
          has_paid: true,
        }) as never
      )

      await expect(
        generatePaymentLink({
          profileId: "prof-1",
          eventId: "evt-1",
          adminProfileId: "admin-1",
        })
      ).rejects.toThrow("Participant is already marked as paid")
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

    it("throws when participant has no full_name", async () => {
      vi.mocked(kyselyDb.selectFrom)
        .mockReturnValueOnce(
          createMockSelectChain({
            ...validParticipantRow,
            full_name: null,
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
      ).rejects.toThrow("Participant profile must have a name")
    })

    it("throws when event has no title", async () => {
      vi.mocked(kyselyDb.selectFrom)
        .mockReturnValueOnce(
          createMockSelectChain({
            ...validParticipantRow,
            event_title: null,
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
      ).rejects.toThrow("Event must have a title")
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

    it("deletes old pending transactions and inserts new ones via transaction", async () => {
      const { mockTrx, mockInsertValues } = setupHappyPathMocks()

      await generatePaymentLink({
        profileId: "prof-1",
        eventId: "evt-1",
        adminProfileId: "admin-1",
      })

      expect(mockTrx.deleteFrom).toHaveBeenCalledWith("payment_transactions")
      expect(mockTrx.insertInto).toHaveBeenCalledWith("payment_transactions")
      expect(mockInsertValues).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            payment_method: "pix",
            status: "pending",
          }),
          expect.objectContaining({
            payment_method: "credit_card",
            status: "pending",
          }),
        ])
      )
    })

    it("updates event_participants by participant_id via transaction", async () => {
      const { mockTrx, mockUpdateSet } = setupHappyPathMocks()

      await generatePaymentLink({
        profileId: "prof-1",
        eventId: "evt-1",
        adminProfileId: "admin-1",
      })

      expect(mockTrx.updateTable).toHaveBeenCalledWith("event_participants")
      expect(mockUpdateSet).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_link_token: expect.any(String),
        })
      )
    })

    it("passes raw objects to asaas_payment_data (not JSON.stringify)", async () => {
      const { mockInsertValues } = setupHappyPathMocks()

      await generatePaymentLink({
        profileId: "prof-1",
        eventId: "evt-1",
        adminProfileId: "admin-1",
      })

      const insertedValues = mockInsertValues.mock.calls[0][0]
      expect(typeof insertedValues[0].asaas_payment_data).toBe("object")
      expect(typeof insertedValues[1].asaas_payment_data).toBe("object")
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

    it("returns token, invoice URLs, and whatsapp message with correct amounts", async () => {
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
      expect(result.whatsappMessage).toContain("R$ 220,00")
      expect(result.whatsappMessage).toContain("R$ 227,00")
      expect(result.whatsappMessage).toContain("Cartão de crédito")
    })
  })

  describe("rollback on DB failure", () => {
    it("deletes Asaas charges when DB transaction fails", async () => {
      setupHappyPathMocks()
      vi.mocked(kyselyDb.transaction).mockReturnValue({
        execute: vi.fn().mockRejectedValue(new Error("DB error")),
      } as never)

      await expect(
        generatePaymentLink({
          profileId: "prof-1",
          eventId: "evt-1",
          adminProfileId: "admin-1",
        })
      ).rejects.toThrow("DB error")

      expect(deletePayment).toHaveBeenCalledWith("pay_1")
      expect(deletePayment).toHaveBeenCalledWith("pay_2")
    })

    it("still throws DB error when Asaas cleanup also fails", async () => {
      setupHappyPathMocks()
      vi.mocked(kyselyDb.transaction).mockReturnValue({
        execute: vi.fn().mockRejectedValue(new Error("DB error")),
      } as never)
      vi.mocked(deletePayment).mockRejectedValue(new Error("Asaas API down"))

      await expect(
        generatePaymentLink({
          profileId: "prof-1",
          eventId: "evt-1",
          adminProfileId: "admin-1",
        })
      ).rejects.toThrow("DB error")

      expect(logger.error).toHaveBeenCalledWith(
        "Failed to clean up Asaas charges after DB error:",
        expect.any(Object),
      )
    })
  })

  describe("rollback on partial Asaas failure", () => {
    it("cleans up PIX charge when credit card charge fails", async () => {
      setupHappyPathMocks()
      vi.mocked(createPaymentCharge)
        .mockReset()
        .mockResolvedValueOnce({
          object: "payment" as const,
          id: "pay_pix_only",
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
          invoiceUrl: "https://sandbox.asaas.com/i/pix",
          transactionReceiptUrl: null,
          deleted: false,
          anticipated: false,
          anticipable: false,
          bankSlipUrl: null,
          nossoNumero: null,
        })
        .mockRejectedValueOnce(new Error("Credit card charge failed"))

      await expect(
        generatePaymentLink({
          profileId: "prof-1",
          eventId: "evt-1",
          adminProfileId: "admin-1",
        })
      ).rejects.toThrow("Credit card charge failed")

      expect(deletePayment).toHaveBeenCalledWith("pay_pix_only")
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
      expect(result.pixInvoiceUrl).toBe("https://sandbox.asaas.com/i/pix-invoice")
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
      expect(result.pixInvoiceUrl).toBe("https://sandbox.asaas.com/i/pix-invoice")
      expect(logger.error).toHaveBeenCalledWith(
        "Error sending payment link email:",
        expect.objectContaining({ error: expect.any(Error) }),
      )
    })
  })
})
