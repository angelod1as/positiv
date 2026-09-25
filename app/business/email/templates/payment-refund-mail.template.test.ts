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
      kind: "asaas",
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
      kind: "asaas",
    })
    expect(card).toContain("10 dias úteis")

    const pix = paymentRefundMailTemplate({
      displayName: "Ana",
      eventTitle: "Festa",
      eventEmoji: null,
      refundAmount: 22199,
      amount: 22199,
      method: "pix",
      kind: "asaas",
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
      kind: "asaas",
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
      kind: "asaas",
    })

    expect(html).not.toContain("parcial")
  })

  it("promises no timing and no fees on money handed back by hand", () => {
    const html = paymentRefundMailTemplate({
      displayName: "Ana",
      eventTitle: "Festa",
      eventEmoji: null,
      refundAmount: 22000,
      amount: 22000,
      method: "cash",
      kind: "manual",
    })

    // A manual payment carried no Asaas fee and did not travel by Pix or card,
    // so neither sentence is true of it.
    expect(html).toContain("R$ 220,00")
    expect(html).toContain("Dinheiro")
    expect(html).not.toContain("Pix cai")
    expect(html).not.toContain("10 dias úteis")
    expect(html).not.toContain("taxas de pagamento")
  })

  it("says the refund is confirmed, not merely asked for", () => {
    const html = paymentRefundMailTemplate({
      displayName: "Ana",
      eventTitle: "Festa",
      eventEmoji: null,
      refundAmount: 21900,
      amount: 22199,
      method: "pix",
      kind: "asaas",
    })

    // Both senders run after the money is already back: the webhook once Asaas
    // confirmed it, and the manual mark once the admin handed it over.
    expect(html).toContain("confirmado")
    expect(html).not.toContain("solicitado")
  })

  it("sizes to its content", () => {
    const html = paymentRefundMailTemplate({
      displayName: "Ana",
      eventTitle: "Festa",
      eventEmoji: null,
      refundAmount: 22000,
      amount: 22000,
      method: "pix",
      kind: "asaas",
    })

    // Clients render mail in an iframe sized to its content, so 100vh feeds
    // back into the iframe height and leaves a huge empty scroll.
    expect(html).not.toContain("100vh")
  })

  it("escapes the name", () => {
    const html = paymentRefundMailTemplate({
      displayName: "<img src=x onerror=alert(1)>",
      eventTitle: "Festa",
      eventEmoji: null,
      refundAmount: 100,
      amount: 100,
      method: "pix",
      kind: "asaas",
    })

    expect(html).not.toContain("onerror")
  })
})
