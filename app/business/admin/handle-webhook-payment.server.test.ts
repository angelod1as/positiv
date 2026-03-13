import { describe, it, expect, vi, beforeEach } from "vitest"
import type { AsaasWebhookPayload } from "~/integrations/asaas/types"

vi.mock("~/kysely-db", () => ({
  kyselyDb: {
    selectFrom: vi.fn(),
    updateTable: vi.fn(),
    transaction: vi.fn(),
  },
}))

vi.mock("~/integrations/asaas/client.server", () => ({
  deletePayment: vi.fn(),
}))

vi.mock("~/business/email/send-email", () => ({
  sendEmail: vi.fn(),
}))

vi.mock("~/business/email/format-payment-success-mail", () => ({
  formatPaymentSuccessMail: vi.fn(),
}))

vi.mock("~/business/email/format-payment-failure-mail", () => ({
  formatPaymentFailureMail: vi.fn(),
}))

vi.mock("~/business/email/templates/payment-success-email.template", () => ({
  getPaymentSuccessEmailSubject: vi.fn(),
}))

vi.mock("~/business/email/templates/payment-failure-email.template", () => ({
  getPaymentFailureEmailSubject: vi.fn(),
}))

vi.mock("~/env.server", () => ({
  env: () => ({ appUrl: "https://positiv.test" }),
}))

import { handleWebhookPayment } from "./handle-webhook-payment.server"
import { kyselyDb } from "~/kysely-db"
import { deletePayment } from "~/integrations/asaas/client.server"
import { sendEmail } from "~/business/email/send-email"
import { formatPaymentSuccessMail } from "~/business/email/format-payment-success-mail"
import { formatPaymentFailureMail } from "~/business/email/format-payment-failure-mail"
import { getPaymentSuccessEmailSubject } from "~/business/email/templates/payment-success-email.template"
import { getPaymentFailureEmailSubject } from "~/business/email/templates/payment-failure-email.template"

const mockTransaction = {
  id: "tx-1",
  status: "pending",
  event_participant_id: "ep-1",
  event_id: "ev-1",
  asaas_payment_id: "pay_123",
}

function makePayload(
  overrides: Partial<AsaasWebhookPayload> = {},
): AsaasWebhookPayload {
  return {
    event: "PAYMENT_CONFIRMED",
    payment: {
      object: "payment",
      id: "pay_123",
      dateCreated: "2026-01-01",
      customer: "cus_456",
      subscription: null,
      installment: null,
      paymentLink: null,
      value: 220,
      netValue: 210,
      originalValue: null,
      interestValue: null,
      billingType: "PIX",
      status: "CONFIRMED",
      dueDate: "2026-01-02",
      originalDueDate: "2026-01-02",
      paymentDate: "2026-01-01",
      clientPaymentDate: "2026-01-01",
      creditDate: null,
      estimatedCreditDate: null,
      description: null,
      externalReference: null,
      installmentNumber: null,
      invoiceUrl: "https://asaas.com/invoice",
      transactionReceiptUrl: null,
      deleted: false,
      anticipated: false,
      anticipable: false,
      bankSlipUrl: null,
      nossoNumero: null,
      ...overrides.payment,
    },
    ...overrides,
  }
}

function mockLookupSelect(result: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    executeTakeFirst: vi.fn().mockResolvedValue(result),
  }
}

function mockSiblingsSelect(siblings: unknown[]) {
  return {
    select: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    execute: vi.fn().mockResolvedValue(siblings),
  }
}

function mockParticipantJoinSelect(result: unknown) {
  return {
    innerJoin: vi.fn().mockReturnValue({
      innerJoin: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            executeTakeFirst: vi.fn().mockResolvedValue(result),
          }),
        }),
      }),
    }),
  }
}

function mockUpdateChain() {
  return {
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        execute: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  }
}

function setupTransactionMock() {
  const mockTrxUpdateChain = () => ({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        execute: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  })

  const mockTrx = {
    updateTable: vi.fn().mockReturnValue(mockTrxUpdateChain()),
  }

  vi.mocked(kyselyDb.transaction).mockReturnValue({
    execute: vi.fn().mockImplementation(async (cb) => cb(mockTrx)),
  } as never)

  return mockTrx
}

function setupDefaultEmailMocks() {
  vi.mocked(formatPaymentSuccessMail).mockResolvedValue({
    html: "<p>success</p>",
    text: "success",
  })
  vi.mocked(getPaymentSuccessEmailSubject).mockReturnValue("Pagamento confirmado")
  vi.mocked(formatPaymentFailureMail).mockResolvedValue({
    html: "<p>failure</p>",
    text: "failure",
  })
  vi.mocked(getPaymentFailureEmailSubject).mockReturnValue("Problema no pagamento")
  vi.mocked(sendEmail).mockResolvedValue({ success: true, data: undefined, errors: [] } as never)
}

describe("handleWebhookPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultEmailMocks()
  })

  describe("lookup and idempotency", () => {
    it("should no-op when transaction not found", async () => {
      vi.mocked(kyselyDb.selectFrom).mockReturnValue(
        mockLookupSelect(undefined) as never,
      )

      await expect(handleWebhookPayment(makePayload())).resolves.toBeUndefined()
      expect(kyselyDb.selectFrom).toHaveBeenCalledWith("payment_transactions")
    })

    it("should no-op when already in target status (confirmed)", async () => {
      vi.mocked(kyselyDb.selectFrom).mockReturnValue(
        mockLookupSelect({ ...mockTransaction, status: "confirmed" }) as never,
      )

      await expect(
        handleWebhookPayment(makePayload({ event: "PAYMENT_CONFIRMED" })),
      ).resolves.toBeUndefined()
      expect(kyselyDb.transaction).not.toHaveBeenCalled()
    })

    it("should no-op when already in target status (failed)", async () => {
      vi.mocked(kyselyDb.selectFrom).mockReturnValue(
        mockLookupSelect({ ...mockTransaction, status: "failed" }) as never,
      )

      await expect(
        handleWebhookPayment(makePayload({ event: "PAYMENT_OVERDUE" })),
      ).resolves.toBeUndefined()
      expect(kyselyDb.transaction).not.toHaveBeenCalled()
    })
  })

  describe("confirmation handler", () => {
    it("should update transaction status and participant in a DB transaction", async () => {
      vi.mocked(kyselyDb.selectFrom)
        .mockReturnValueOnce(mockLookupSelect(mockTransaction) as never)
        .mockReturnValueOnce(mockSiblingsSelect([]) as never)
        .mockReturnValueOnce(mockParticipantJoinSelect(null) as never)

      const mockTrx = setupTransactionMock()

      await handleWebhookPayment(makePayload({ event: "PAYMENT_CONFIRMED" }))

      expect(kyselyDb.transaction).toHaveBeenCalled()
      expect(mockTrx.updateTable).toHaveBeenCalledTimes(2)
    })

    it("should trigger confirmation for PAYMENT_RECEIVED event", async () => {
      vi.mocked(kyselyDb.selectFrom)
        .mockReturnValueOnce(mockLookupSelect(mockTransaction) as never)
        .mockReturnValueOnce(mockSiblingsSelect([]) as never)
        .mockReturnValueOnce(mockParticipantJoinSelect(null) as never)

      const mockTrx = setupTransactionMock()

      await handleWebhookPayment(makePayload({ event: "PAYMENT_RECEIVED" }))

      expect(kyselyDb.transaction).toHaveBeenCalled()
      expect(mockTrx.updateTable).toHaveBeenCalledTimes(2)
    })

    it("should cancel sibling transactions", async () => {
      const sibling = { id: "tx-2", asaas_payment_id: "pay_456" }

      vi.mocked(kyselyDb.selectFrom)
        .mockReturnValueOnce(mockLookupSelect(mockTransaction) as never)
        .mockReturnValueOnce(mockSiblingsSelect([sibling]) as never)
        .mockReturnValueOnce(mockParticipantJoinSelect(null) as never)

      ;(kyselyDb.updateTable as ReturnType<typeof vi.fn>).mockReturnValue(mockUpdateChain())
      setupTransactionMock()
      vi.mocked(deletePayment).mockResolvedValue(undefined)

      await handleWebhookPayment(makePayload({ event: "PAYMENT_CONFIRMED" }))

      expect(deletePayment).toHaveBeenCalledWith("pay_456")
      expect(kyselyDb.updateTable).toHaveBeenCalledWith("payment_transactions")
    })

    it("should log error but not throw when deletePayment fails", async () => {
      const sibling = { id: "tx-2", asaas_payment_id: "pay_456" }

      vi.mocked(kyselyDb.selectFrom)
        .mockReturnValueOnce(mockLookupSelect(mockTransaction) as never)
        .mockReturnValueOnce(mockSiblingsSelect([sibling]) as never)
        .mockReturnValueOnce(mockParticipantJoinSelect(null) as never)

      ;(kyselyDb.updateTable as ReturnType<typeof vi.fn>).mockReturnValue(mockUpdateChain())
      setupTransactionMock()
      vi.mocked(deletePayment).mockRejectedValue(new Error("Asaas API error"))

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

      await expect(
        handleWebhookPayment(makePayload({ event: "PAYMENT_CONFIRMED" })),
      ).resolves.toBeUndefined()

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to delete sibling payment"),
        expect.any(Error),
      )

      consoleSpy.mockRestore()
    })

    it("should send success email with correct args", async () => {
      const participantData = {
        full_name: "Test User",
        social_name: "Testy",
        email: "test@example.com",
        event_title: "Cool Event",
        event_emoji: "🎉",
      }

      vi.mocked(kyselyDb.selectFrom)
        .mockReturnValueOnce(mockLookupSelect(mockTransaction) as never)
        .mockReturnValueOnce(mockSiblingsSelect([]) as never)
        .mockReturnValueOnce(mockParticipantJoinSelect(participantData) as never)

      setupTransactionMock()

      await handleWebhookPayment(makePayload({ event: "PAYMENT_CONFIRMED" }))

      expect(formatPaymentSuccessMail).toHaveBeenCalledWith(
        "Testy",
        "Cool Event",
        "🎉",
        "Pix",
        "220,00",
        null,
        "2026-01-01",
      )
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "test@example.com",
          subject: "Pagamento confirmado",
        }),
      )
    })

    it("should use full_name when social_name is null", async () => {
      const participantData = {
        full_name: "Test User",
        social_name: null,
        email: "test@example.com",
        event_title: "Cool Event",
        event_emoji: null,
      }

      vi.mocked(kyselyDb.selectFrom)
        .mockReturnValueOnce(mockLookupSelect(mockTransaction) as never)
        .mockReturnValueOnce(mockSiblingsSelect([]) as never)
        .mockReturnValueOnce(mockParticipantJoinSelect(participantData) as never)

      setupTransactionMock()

      await handleWebhookPayment(makePayload({ event: "PAYMENT_CONFIRMED" }))

      expect(formatPaymentSuccessMail).toHaveBeenCalledWith(
        "Test User",
        "Cool Event",
        null,
        "Pix",
        "220,00",
        null,
        "2026-01-01",
      )
    })

    it("should log error but not throw when email sending fails", async () => {
      vi.mocked(kyselyDb.selectFrom)
        .mockReturnValueOnce(mockLookupSelect(mockTransaction) as never)
        .mockReturnValueOnce(mockSiblingsSelect([]) as never)
        .mockReturnValueOnce(
          mockParticipantJoinSelect({
            full_name: "Test",
            social_name: null,
            email: "test@example.com",
            event_title: "Event",
            event_emoji: null,
          }) as never,
        )

      setupTransactionMock()
      vi.mocked(sendEmail).mockRejectedValue(new Error("SMTP error"))

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

      await expect(
        handleWebhookPayment(makePayload({ event: "PAYMENT_CONFIRMED" })),
      ).resolves.toBeUndefined()

      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to send confirmation email:",
        expect.any(Error),
      )

      consoleSpy.mockRestore()
    })
  })

  describe("failure handler", () => {
    it("should update status to failed for PAYMENT_OVERDUE without sending email", async () => {
      vi.mocked(kyselyDb.selectFrom).mockReturnValue(
        mockLookupSelect(mockTransaction) as never,
      )
      ;(kyselyDb.updateTable as ReturnType<typeof vi.fn>).mockReturnValue(mockUpdateChain())

      await handleWebhookPayment(makePayload({ event: "PAYMENT_OVERDUE" }))

      expect(kyselyDb.updateTable).toHaveBeenCalledWith("payment_transactions")
      expect(sendEmail).not.toHaveBeenCalled()
    })

    it("should update status to failed and send email for CAPTURE_REFUSED", async () => {
      const participantData = {
        full_name: "Test User",
        social_name: null,
        email: "test@example.com",
        event_title: "Cool Event",
        event_emoji: "🎉",
        payment_link_token: "abc-123-token",
      }

      vi.mocked(kyselyDb.selectFrom)
        .mockReturnValueOnce(mockLookupSelect(mockTransaction) as never)
        .mockReturnValueOnce(mockParticipantJoinSelect(participantData) as never)

      ;(kyselyDb.updateTable as ReturnType<typeof vi.fn>).mockReturnValue(mockUpdateChain())

      await handleWebhookPayment(
        makePayload({ event: "PAYMENT_CREDIT_CARD_CAPTURE_REFUSED" }),
      )

      expect(kyselyDb.updateTable).toHaveBeenCalledWith("payment_transactions")
      expect(formatPaymentFailureMail).toHaveBeenCalledWith(
        "Test User",
        "Cool Event",
        "🎉",
        null,
        "https://positiv.test/pagamento/abc-123-token",
      )
      expect(sendEmail).toHaveBeenCalled()
    })
  })

  describe("refund handler", () => {
    it("should update status to refunded with refund_reason", async () => {
      vi.mocked(kyselyDb.selectFrom).mockReturnValue(
        mockLookupSelect(mockTransaction) as never,
      )
      const updateChain = mockUpdateChain()
      ;(kyselyDb.updateTable as ReturnType<typeof vi.fn>).mockReturnValue(updateChain)

      await handleWebhookPayment(makePayload({ event: "PAYMENT_REFUNDED" }))

      expect(kyselyDb.updateTable).toHaveBeenCalledWith("payment_transactions")
      expect(updateChain.set).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "refunded",
          refund_reason: "Reembolso processado via Asaas",
        }),
      )
    })
  })
})
