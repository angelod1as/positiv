import { describe, it, expect } from "vitest"
import { formatPaymentLinkMail } from "./format-payment-link-mail"
import { buildPaymentOptions } from "~/business/payment/payment-pricing.server"

describe("formatPaymentLinkMail", () => {
  const params = {
    participantName: "João Silva",
    eventName: "Positiv Regular",
    paymentOptions: buildPaymentOptions(220),
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
