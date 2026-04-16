import { describe, it, expect } from "vitest"
import { formatPaymentLinkMail } from "./format-payment-link-mail"
import type { PaymentOption } from "~/business/email/payment-email.types"

const testPaymentOptions: PaymentOption[] = [
  { value: "PIX", billingType: "PIX", installments: 1, totalReais: 220, perInstallmentReais: 220 },
  { value: "CC_1", billingType: "CREDIT_CARD", installments: 1, totalReais: 226.87, perInstallmentReais: 226.87 },
]

describe("formatPaymentLinkMail", () => {
  const params = {
    participantName: "João Silva",
    eventName: "Positiv Regular",
    paymentOptions: testPaymentOptions,
    paymentUrl: "https://www.positivparty.com/pagamento/abc-123",
    expiresAt: new Date("2026-03-17T12:00:00Z"),
  }

  it("returns html and text versions", () => {
    const { html, text } = formatPaymentLinkMail(params)
    expect(html).toContain("<!DOCTYPE html>")
    expect(text).toContain("João Silva")
    expect(text).toContain("Positiv Regular")
  })

  it("text version includes payment URL", () => {
    const { text } = formatPaymentLinkMail(params)
    expect(text).toContain("https://www.positivparty.com/pagamento/abc-123")
  })
})
