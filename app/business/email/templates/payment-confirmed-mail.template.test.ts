import { describe, expect, it } from "vitest"
import { paymentConfirmedMailTemplate } from "./payment-confirmed-mail.template"

describe("paymentConfirmedMailTemplate", () => {
  it("states what was paid, how, and for which event", () => {
    const html = paymentConfirmedMailTemplate({
      displayName: "Ana",
      eventTitle: "Festa de Setembro",
      eventEmoji: "🎉",
      amount: 23454,
      method: "credit_card",
      installmentCount: 3,
      paidAt: "2026-08-24T12:00:00Z",
    })

    expect(html).toContain("Ana")
    expect(html).toContain("Festa de Setembro")
    expect(html).toContain("R$ 234,54")
    expect(html).toContain("Cartão de crédito")
    expect(html).toContain("3x")
  })

  it("does not mention installments for Pix", () => {
    const html = paymentConfirmedMailTemplate({
      displayName: "Ana",
      eventTitle: "Festa",
      eventEmoji: null,
      amount: 22199,
      method: "pix",
      installmentCount: null,
      paidAt: "2026-08-24T12:00:00Z",
    })

    expect(html).toContain("Pix")
    expect(html).not.toMatch(/\dx/)
  })

  it("escapes the name", () => {
    const html = paymentConfirmedMailTemplate({
      displayName: "<img src=x onerror=alert(1)>",
      eventTitle: "Festa",
      eventEmoji: null,
      amount: 100,
      method: "pix",
      installmentCount: null,
      paidAt: "2026-08-24T12:00:00Z",
    })

    expect(html).not.toContain("onerror")
  })

  it("dates the payment in Brazil", () => {
    const html = paymentConfirmedMailTemplate({
      displayName: "Ana",
      eventTitle: "Festa",
      eventEmoji: null,
      amount: 22199,
      method: "pix",
      installmentCount: null,
      paidAt: "2026-08-24T02:00:00Z",
    })

    expect(html).toContain("23/08/2026")
  })
})
