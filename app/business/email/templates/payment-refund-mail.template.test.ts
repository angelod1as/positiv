import { describe, expect, it } from "vitest"
import { paymentRefundMailTemplate } from "./payment-refund-mail.template"

describe("paymentRefundMailTemplate", () => {
  it("states what came back, how, and for which event", () => {
    const html = paymentRefundMailTemplate({
      displayName: "Ana",
      eventTitle: "Festa de Setembro",
      eventEmoji: "🎉",
      refundAmount: 21900,
      amount: 22199,
      method: "pix",
    })

    expect(html).toContain("Ana")
    expect(html).toContain("Festa de Setembro")
    expect(html).toContain("R$ 219,00")
    expect(html).toContain("Pix")
  })

  it("says how long a card takes and a Pix does not", () => {
    const card = paymentRefundMailTemplate({
      displayName: "Ana",
      eventTitle: "Festa",
      eventEmoji: null,
      refundAmount: 23631,
      amount: 23631,
      method: "credit_card",
    })
    expect(card).toContain("10 dias úteis")

    const pix = paymentRefundMailTemplate({
      displayName: "Ana",
      eventTitle: "Festa",
      eventEmoji: null,
      refundAmount: 22199,
      amount: 22199,
      method: "pix",
    })
    expect(pix).not.toContain("10 dias úteis")
  })

  it("says it is partial when less than the payment came back", () => {
    const html = paymentRefundMailTemplate({
      displayName: "Ana",
      eventTitle: "Festa",
      eventEmoji: null,
      refundAmount: 5000,
      amount: 22199,
      method: "pix",
    })

    expect(html).toContain("parcial")
    expect(html).toContain("R$ 50,00")
    expect(html).toContain("R$ 221,99")
  })

  it("does not call a whole refund partial", () => {
    const html = paymentRefundMailTemplate({
      displayName: "Ana",
      eventTitle: "Festa",
      eventEmoji: null,
      refundAmount: 22199,
      amount: 22199,
      method: "pix",
    })

    expect(html).not.toContain("parcial")
  })

  it("escapes the name", () => {
    const html = paymentRefundMailTemplate({
      displayName: "<img src=x onerror=alert(1)>",
      eventTitle: "Festa",
      eventEmoji: null,
      refundAmount: 100,
      amount: 100,
      method: "pix",
    })

    expect(html).not.toContain("onerror")
  })
})
