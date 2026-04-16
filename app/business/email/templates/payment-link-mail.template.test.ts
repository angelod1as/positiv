import { describe, it, expect } from "vitest"
import { paymentLinkMailTemplate } from "./payment-link-mail.template"
import type { PaymentOption } from "~/business/payment/payment-pricing.server"

const testPaymentOptions: PaymentOption[] = [
  { value: "PIX", billingType: "PIX", installments: 1, totalReais: 220, perInstallmentReais: 220 },
  { value: "CC_1", billingType: "CREDIT_CARD", installments: 1, totalReais: 226.87, perInstallmentReais: 226.87 },
  { value: "CC_2", billingType: "CREDIT_CARD", installments: 2, totalReais: 234.06, perInstallmentReais: 117.03 },
  { value: "CC_3", billingType: "CREDIT_CARD", installments: 3, totalReais: 241.44, perInstallmentReais: 80.48 },
  { value: "CC_4", billingType: "CREDIT_CARD", installments: 4, totalReais: 249.01, perInstallmentReais: 62.26 },
]

const defaultParams = {
  participantName: "João Silva",
  eventName: "Positiv Regular",
  paymentOptions: testPaymentOptions,
  paymentUrl: "https://www.positivparty.com/pagamento/abc-123",
  expiresAt: new Date("2026-03-17T12:00:00Z"),
}

describe("paymentLinkMailTemplate", () => {
  it("includes participant name", () => {
    const html = paymentLinkMailTemplate(defaultParams)
    expect(html).toContain("João Silva")
  })

  it("includes event name", () => {
    const html = paymentLinkMailTemplate(defaultParams)
    expect(html).toContain("Positiv Regular")
  })

  it("includes PIX price", () => {
    const html = paymentLinkMailTemplate(defaultParams)
    expect(html).toContain("R$")
    expect(html).toContain("220")
  })

  it("includes credit card installment options", () => {
    const html = paymentLinkMailTemplate(defaultParams)
    expect(html).toContain("1x")
    expect(html).toContain("2x")
    expect(html).toContain("3x")
    expect(html).toContain("4x")
  })

  it("includes payment link button", () => {
    const html = paymentLinkMailTemplate(defaultParams)
    expect(html).toContain("https://www.positivparty.com/pagamento/abc-123")
  })

  it("includes expiration date", () => {
    const html = paymentLinkMailTemplate(defaultParams)
    expect(html).toContain("17/03/2026")
  })

  it("sanitizes participant name against XSS", () => {
    const html = paymentLinkMailTemplate({
      ...defaultParams,
      participantName: '<script>alert("xss")</script>João',
    })
    expect(html).not.toContain("<script>")
    expect(html).toContain("João")
  })

  it("sanitizes event name against XSS", () => {
    const html = paymentLinkMailTemplate({
      ...defaultParams,
      eventName: '<img onerror="alert(1)" src=x>Event',
    })
    expect(html).not.toContain("onerror")
  })

  it("rejects payment URLs with invalid protocol", () => {
    expect(() =>
      paymentLinkMailTemplate({
        ...defaultParams,
        paymentUrl: 'javascript:alert("xss")',
      }),
    ).toThrow("Invalid payment URL")
  })

  it("is valid HTML", () => {
    const html = paymentLinkMailTemplate(defaultParams)
    expect(html).toContain("<!DOCTYPE html>")
    expect(html).toContain("</html>")
  })
})
