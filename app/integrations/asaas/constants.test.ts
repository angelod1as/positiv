import { describe, expect, it } from "vitest"
import {
  ASAAS_API_URLS,
  ASAAS_REQUIRED_HEADERS,
  BILLING_TYPE_TO_PAYMENT_METHOD,
  formatCentavos,
  HANDLED_WEBHOOK_EVENTS,
  PAYMENT_LINK_EXPIRY_HOURS,
  PAYMENT_PRICING,
  WEBHOOK_EVENT_TO_TRANSACTION_STATUS,
} from "./constants"

describe("Asaas constants", () => {
  describe("ASAAS_API_URLS", () => {
    it("has sandbox URL pointing to api-sandbox.asaas.com/v3", () => {
      expect(ASAAS_API_URLS.sandbox).toBe(
        "https://api-sandbox.asaas.com/v3",
      )
    })

    it("has production URL pointing to api.asaas.com/v3", () => {
      expect(ASAAS_API_URLS.production).toBe("https://api.asaas.com/v3")
    })
  })

  describe("ASAAS_REQUIRED_HEADERS", () => {
    it("includes Content-Type as application/json", () => {
      expect(ASAAS_REQUIRED_HEADERS["Content-Type"]).toBe(
        "application/json",
      )
    })
  })

  describe("PAYMENT_PRICING", () => {
    it("has pix at 22000 centavos (R$ 220)", () => {
      expect(PAYMENT_PRICING.pix.amount).toBe(22_000)
    })

    it("has credit card at 22700 centavos (R$ 227) with 6 max installments", () => {
      expect(PAYMENT_PRICING.creditCard.amount).toBe(22_700)
      expect(PAYMENT_PRICING.creditCard.maxInstallments).toBe(6)
    })
  })

  describe("formatCentavos", () => {
    it("formats 22000 centavos as 220,00", () => {
      expect(formatCentavos(22_000)).toBe("220,00")
    })

    it("formats 22700 centavos as 227,00", () => {
      expect(formatCentavos(22_700)).toBe("227,00")
    })

    it("formats 150 centavos as 1,50", () => {
      expect(formatCentavos(150)).toBe("1,50")
    })
  })

  describe("PAYMENT_LINK_EXPIRY_HOURS", () => {
    it("is 48 hours", () => {
      expect(PAYMENT_LINK_EXPIRY_HOURS).toBe(48)
    })
  })

  describe("HANDLED_WEBHOOK_EVENTS", () => {
    it("contains exactly 5 events we handle", () => {
      expect(HANDLED_WEBHOOK_EVENTS).toHaveLength(5)
    })

    it("includes PAYMENT_CONFIRMED", () => {
      expect(HANDLED_WEBHOOK_EVENTS).toContain("PAYMENT_CONFIRMED")
    })

    it("includes PAYMENT_RECEIVED", () => {
      expect(HANDLED_WEBHOOK_EVENTS).toContain("PAYMENT_RECEIVED")
    })

    it("includes PAYMENT_REFUNDED", () => {
      expect(HANDLED_WEBHOOK_EVENTS).toContain("PAYMENT_REFUNDED")
    })

    it("includes PAYMENT_OVERDUE", () => {
      expect(HANDLED_WEBHOOK_EVENTS).toContain("PAYMENT_OVERDUE")
    })

    it("includes PAYMENT_CREDIT_CARD_CAPTURE_REFUSED", () => {
      expect(HANDLED_WEBHOOK_EVENTS).toContain(
        "PAYMENT_CREDIT_CARD_CAPTURE_REFUSED",
      )
    })
  })

  describe("BILLING_TYPE_TO_PAYMENT_METHOD", () => {
    it("maps PIX to pix", () => {
      expect(BILLING_TYPE_TO_PAYMENT_METHOD.PIX).toBe("pix")
    })

    it("maps CREDIT_CARD to credit_card", () => {
      expect(BILLING_TYPE_TO_PAYMENT_METHOD.CREDIT_CARD).toBe(
        "credit_card",
      )
    })

  })

  describe("WEBHOOK_EVENT_TO_TRANSACTION_STATUS", () => {
    it("maps PAYMENT_CONFIRMED to confirmed", () => {
      expect(WEBHOOK_EVENT_TO_TRANSACTION_STATUS.PAYMENT_CONFIRMED).toBe(
        "confirmed",
      )
    })

    it("maps PAYMENT_RECEIVED to confirmed", () => {
      expect(WEBHOOK_EVENT_TO_TRANSACTION_STATUS.PAYMENT_RECEIVED).toBe(
        "confirmed",
      )
    })

    it("maps PAYMENT_REFUNDED to refunded", () => {
      expect(WEBHOOK_EVENT_TO_TRANSACTION_STATUS.PAYMENT_REFUNDED).toBe(
        "refunded",
      )
    })

    it("maps PAYMENT_OVERDUE to failed", () => {
      expect(WEBHOOK_EVENT_TO_TRANSACTION_STATUS.PAYMENT_OVERDUE).toBe(
        "failed",
      )
    })

    it("maps PAYMENT_CREDIT_CARD_CAPTURE_REFUSED to failed", () => {
      expect(
        WEBHOOK_EVENT_TO_TRANSACTION_STATUS.PAYMENT_CREDIT_CARD_CAPTURE_REFUSED,
      ).toBe("failed")
    })
  })
})
