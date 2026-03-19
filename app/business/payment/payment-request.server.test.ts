import { describe, it, expect, vi, beforeEach } from "vitest"

const mockKyselyDb = vi.hoisted(() => ({
  insertInto: vi.fn(),
  selectFrom: vi.fn(),
  updateTable: vi.fn(),
}))

vi.mock("~/kysely-db", () => ({
  kyselyDb: mockKyselyDb,
}))

vi.mock("./asaas-client.server", () => ({
  createAsaasCustomer: vi.fn(),
  createAsaasPayment: vi.fn(),
  cancelAsaasPayment: vi.fn(),
}))

vi.mock("./send-payment-refund-email.server", () => ({
  sendPaymentRefundEmail: vi.fn().mockResolvedValue({ emailSent: true }),
}))

vi.mock("~/lib/logger/logger.server", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock("./payment-pricing.server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./payment-pricing.server")>()
  return {
    ...actual,
  }
})

import {
  createPaymentRequest,
  getActivePaymentRequest,
  cancelActivePaymentRequest,
  confirmPaymentChoice,
  markPaymentAsExpired,
  markManualPaymentRefunded,
} from "./payment-request.server"
import { createAsaasCustomer, createAsaasPayment, cancelAsaasPayment } from "./asaas-client.server"
import { sendPaymentRefundEmail } from "./send-payment-refund-email.server"

function chainable(returnValue?: unknown) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop) {
      if (typeof prop === "symbol") return undefined
      if (prop === "then") return undefined
      if (!chain[prop]) {
        chain[prop] = vi.fn().mockReturnValue(new Proxy({}, handler))
      }
      if (prop === "executeTakeFirstOrThrow" || prop === "executeTakeFirst") {
        chain[prop].mockResolvedValue(returnValue)
      }
      if (prop === "execute") {
        chain[prop].mockResolvedValue(returnValue ?? [])
      }
      return chain[prop]
    },
  }
  return new Proxy({}, handler)
}

describe("payment-request.server", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("createPaymentRequest", () => {
    it("creates a pending payment request with correct defaults", async () => {
      const now = new Date("2026-03-15T12:00:00Z")
      vi.setSystemTime(now)

      const expectedRow = {
        id: "pr-1",
        event_participant_id: "ep-1",
        amount: 220,
        status: "pending",
        expires_at: new Date("2026-03-17T12:00:00Z").toISOString(),
        created_at: now.toISOString(),
      }

      mockKyselyDb.insertInto.mockReturnValue(chainable(expectedRow))

      const result = await createPaymentRequest({
        eventParticipantId: "ep-1",
        ticketPrice: 220,
      })

      expect(result).toEqual(expectedRow)
      expect(mockKyselyDb.insertInto).toHaveBeenCalledWith("payment_requests")

      vi.useRealTimers()
    })
  })

  describe("getActivePaymentRequest", () => {
    it("returns non-expired, non-cancelled request", async () => {
      const activeRequest = {
        id: "pr-1",
        status: "pending",
        event_participant_id: "ep-1",
      }

      mockKyselyDb.selectFrom.mockReturnValue(chainable(activeRequest))

      const result = await getActivePaymentRequest("ep-1")

      expect(result).toEqual(activeRequest)
      expect(mockKyselyDb.selectFrom).toHaveBeenCalledWith("payment_requests")
    })

    it("returns null when no active request exists", async () => {
      mockKyselyDb.selectFrom.mockReturnValue(chainable(null))

      const result = await getActivePaymentRequest("ep-1")

      expect(result).toBeNull()
    })
  })

  describe("confirmPaymentChoice", () => {
    it("creates Asaas customer and payment, updates DB, returns invoiceUrl", async () => {
      const paymentRequest = {
        id: "pr-1",
        event_participant_id: "ep-1",
        amount: 220,
        status: "pending",
      }

      const profileData = {
        full_name: "João Silva",
        cpf: "12345678900",
        email: "joao@test.com",
        phone: 11999998888,
      }

      mockKyselyDb.selectFrom.mockReturnValueOnce(chainable(paymentRequest))
      mockKyselyDb.selectFrom.mockReturnValueOnce(chainable(profileData))
      mockKyselyDb.updateTable.mockReturnValue(chainable({ id: "pr-1" }))

      vi.mocked(createAsaasCustomer).mockResolvedValue({ id: "cus_1" })
      vi.mocked(createAsaasPayment).mockResolvedValue({
        id: "pay_1",
        invoiceUrl: "https://sandbox.asaas.com/i/pay_1",
      })

      const result = await confirmPaymentChoice({
        eventParticipantId: "ep-1",
        paymentOption: "CC_2",
      })

      expect(result.invoiceUrl).toBe("https://sandbox.asaas.com/i/pay_1")
      expect(createAsaasCustomer).toHaveBeenCalledWith({
        name: "João Silva",
        cpfCnpj: "12345678900",
        email: "joao@test.com",
        phone: "11999998888",
      })
      expect(createAsaasPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: "cus_1",
          billingType: "CREDIT_CARD",
          installmentCount: 2,
        }),
      )
    })

    it("throws when payment request not found", async () => {
      mockKyselyDb.selectFrom.mockReturnValueOnce(chainable(null))

      await expect(
        confirmPaymentChoice({
          eventParticipantId: "ep-1",
          paymentOption: "PIX",
        }),
      ).rejects.toThrow()
    })

    it("throws when profile has no CPF", async () => {
      const paymentRequest = {
        id: "pr-1",
        event_participant_id: "ep-1",
        amount: 220,
        status: "pending",
      }

      mockKyselyDb.selectFrom.mockReturnValueOnce(chainable(paymentRequest))
      mockKyselyDb.selectFrom.mockReturnValueOnce(
        chainable({ full_name: "João", cpf: null }),
      )

      await expect(
        confirmPaymentChoice({
          eventParticipantId: "ep-1",
          paymentOption: "PIX",
        }),
      ).rejects.toThrow("CPF")
    })

    it("uses PIX billing type and ticket price for PIX option", async () => {
      const paymentRequest = {
        id: "pr-1",
        event_participant_id: "ep-1",
        amount: 220,
        status: "pending",
      }

      mockKyselyDb.selectFrom.mockReturnValueOnce(chainable(paymentRequest))
      mockKyselyDb.selectFrom.mockReturnValueOnce(
        chainable({ full_name: "João", cpf: "12345678900", email: "joao@test.com", phone: null }),
      )
      mockKyselyDb.updateTable.mockReturnValue(chainable({ id: "pr-1" }))

      vi.mocked(createAsaasCustomer).mockResolvedValue({ id: "cus_1" })
      vi.mocked(createAsaasPayment).mockResolvedValue({
        id: "pay_1",
        invoiceUrl: "https://sandbox.asaas.com/i/pay_1",
      })

      await confirmPaymentChoice({
        eventParticipantId: "ep-1",
        paymentOption: "PIX",
      })

      expect(createAsaasPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          billingType: "PIX",
          value: 220,
        }),
      )
    })
  })

  describe("markPaymentAsExpired", () => {
    it("updates status to expired", async () => {
      mockKyselyDb.updateTable.mockReturnValue(chainable(undefined))

      await markPaymentAsExpired("pr-1")

      expect(mockKyselyDb.updateTable).toHaveBeenCalledWith("payment_requests")
    })
  })

  describe("cancelActivePaymentRequest", () => {
    it("cancels active request and calls Asaas cancel when asaas_payment_id exists", async () => {
      const activeRequest = {
        id: "pr-active",
        event_participant_id: "ep-1",
        asaas_payment_id: "pay_old",
        status: "awaiting_payment",
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      }

      mockKyselyDb.selectFrom.mockReturnValue(chainable(activeRequest))
      mockKyselyDb.updateTable.mockReturnValue(chainable(undefined))

      await cancelActivePaymentRequest("ep-1")

      expect(cancelAsaasPayment).toHaveBeenCalledWith("pay_old")
      expect(mockKyselyDb.updateTable).toHaveBeenCalledWith("payment_requests")
    })

    it("cancels active request without Asaas call when no asaas_payment_id", async () => {
      const activeRequest = {
        id: "pr-active",
        event_participant_id: "ep-1",
        asaas_payment_id: null,
        status: "pending",
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      }

      mockKyselyDb.selectFrom.mockReturnValue(chainable(activeRequest))
      mockKyselyDb.updateTable.mockReturnValue(chainable(undefined))

      await cancelActivePaymentRequest("ep-1")

      expect(cancelAsaasPayment).not.toHaveBeenCalled()
      expect(mockKyselyDb.updateTable).toHaveBeenCalledWith("payment_requests")
    })

    it("still cancels locally when Asaas cancel fails", async () => {
      const activeRequest = {
        id: "pr-active",
        event_participant_id: "ep-1",
        asaas_payment_id: "pay_old",
        status: "awaiting_payment",
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      }

      mockKyselyDb.selectFrom.mockReturnValue(chainable(activeRequest))
      mockKyselyDb.updateTable.mockReturnValue(chainable(undefined))
      vi.mocked(cancelAsaasPayment).mockRejectedValueOnce(new Error("Asaas API error"))

      await cancelActivePaymentRequest("ep-1")

      expect(cancelAsaasPayment).toHaveBeenCalledWith("pay_old")
      expect(mockKyselyDb.updateTable).toHaveBeenCalledWith("payment_requests")
    })


    it("does nothing when no active request exists", async () => {
      mockKyselyDb.selectFrom.mockReturnValue(chainable(null))

      await cancelActivePaymentRequest("ep-1")

      expect(cancelAsaasPayment).not.toHaveBeenCalled()
      expect(mockKyselyDb.updateTable).not.toHaveBeenCalled()
    })
  })

  describe("markManualPaymentRefunded", () => {
    it("sends refund notification email after marking as refunded", async () => {
      const refundedRequest = {
        id: "pr-1",
        event_participant_id: "ep-1",
        amount: 100,
        status: "refunded",
        payment_mode: "manual",
      }

      mockKyselyDb.updateTable.mockReturnValue(chainable(refundedRequest))
      mockKyselyDb.selectFrom.mockReturnValue(
        chainable({ email: "joao@test.com", full_name: "João", title: "Positiv Regular" }),
      )

      await markManualPaymentRefunded("ep-1")

      expect(sendPaymentRefundEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          participantEmail: "joao@test.com",
          participantName: "João",
          eventName: "Positiv Regular",
          refundAmount: 100,
        }),
      )
    })

    it("still succeeds when refund email fails", async () => {
      const refundedRequest = {
        id: "pr-1",
        event_participant_id: "ep-1",
        amount: 100,
        status: "refunded",
        payment_mode: "manual",
      }

      mockKyselyDb.updateTable.mockReturnValue(chainable(refundedRequest))
      mockKyselyDb.selectFrom.mockReturnValue(
        chainable({ email: "joao@test.com", full_name: "João", title: "Positiv Regular" }),
      )
      vi.mocked(sendPaymentRefundEmail).mockRejectedValueOnce(new Error("Email failed"))

      const result = await markManualPaymentRefunded("ep-1")
      expect(result).toEqual(refundedRequest)
    })
  })
})
