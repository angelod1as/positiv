import { describe, it, expect, vi, beforeEach } from "vitest"
import type { AsaasWebhookPayload } from "~/integrations/asaas/types"

const { mockKyselyDb } = vi.hoisted(() => ({
  mockKyselyDb: {
    selectFrom: vi.fn(),
    updateTable: vi.fn(),
    transaction: vi.fn(),
  },
}))

vi.mock("~/kysely-db", () => ({
  kyselyDb: mockKyselyDb,
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

vi.mock("~/env.server", () => ({
  env: () => ({ appUrl: "https://positiv.test" }),
}))

import { handleWebhookPayment } from "./handle-webhook-payment.server"

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

describe("handleWebhookPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should no-op when transaction not found by asaas_payment_id", async () => {
    const selectChain = {
      select: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      executeTakeFirst: vi.fn().mockResolvedValue(undefined),
    }
    mockKyselyDb.selectFrom.mockReturnValue(selectChain)

    await expect(
      handleWebhookPayment(makePayload()),
    ).resolves.toBeUndefined()

    expect(mockKyselyDb.selectFrom).toHaveBeenCalledWith(
      "payment_transactions",
    )
  })

  it("should no-op when transaction is already in the target status (confirmed)", async () => {
    const selectChain = {
      select: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      executeTakeFirst: vi.fn().mockResolvedValue({
        id: "tx-1",
        status: "confirmed",
        event_participant_id: "ep-1",
        event_id: "ev-1",
        asaas_payment_id: "pay_123",
      }),
    }
    mockKyselyDb.selectFrom.mockReturnValue(selectChain)

    await expect(
      handleWebhookPayment(makePayload({ event: "PAYMENT_CONFIRMED" })),
    ).resolves.toBeUndefined()

    expect(mockKyselyDb.transaction).not.toHaveBeenCalled()
  })

  it("should no-op when transaction is already in the target status (failed)", async () => {
    const selectChain = {
      select: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      executeTakeFirst: vi.fn().mockResolvedValue({
        id: "tx-1",
        status: "failed",
        event_participant_id: "ep-1",
        event_id: "ev-1",
        asaas_payment_id: "pay_123",
      }),
    }
    mockKyselyDb.selectFrom.mockReturnValue(selectChain)

    await expect(
      handleWebhookPayment(makePayload({ event: "PAYMENT_OVERDUE" })),
    ).resolves.toBeUndefined()

    expect(mockKyselyDb.transaction).not.toHaveBeenCalled()
  })
})
