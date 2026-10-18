import { describe, expect, it } from "vitest"
import type { PaymentLinkCopy } from "~/business/email/payment-link-mail-copy"
import { buildPaymentOptions } from "~/business/payment/pricing"
import { paymentLinkMailTemplate } from "./payment-link-mail.template"

const input = {
  displayName: "Ana",
  eventTitle: "Festa",
  eventEmoji: "🎉",
  paymentUrl: "https://www.positivparty.com/pagamento/abc",
  dueAt: "2026-09-01T12:00:00Z",
  options: buildPaymentOptions(22000, { cardEnabled: true }),
}

const copy: PaymentLinkCopy = {
  subject: "Seu pagamento da {{evento}}",
  heading: "Olá!",
  bodyParagraphs: ["Oi {{nome}}, bem-vinde à <strong>{{evento}}</strong>."],
}

describe("paymentLinkMailTemplate with copy from the CMS", () => {
  it("renders the copy it is given, filling the placeholders", () => {
    const html = paymentLinkMailTemplate(input, copy)

    expect(html).toContain("Olá!")
    expect(html).toContain(
      "Oi Ana, bem-vinde à <strong>🎉&nbsp;Festa</strong>.",
    )
  })

  it("HTML-escapes a value so a participant cannot inject markup", () => {
    const html = paymentLinkMailTemplate(
      { ...input, displayName: '<img src=x onerror="steal()">' },
      copy,
    )

    expect(html).not.toContain("onerror")
  })

  it("throws on a body placeholder outside the whitelist", () => {
    expect(() =>
      paymentLinkMailTemplate(input, {
        ...copy,
        bodyParagraphs: ["Pague em {{boleto}}."],
      }),
    ).toThrow(/boleto/)
  })

  it("throws on a placeholder the heading does not allow", () => {
    expect(() =>
      paymentLinkMailTemplate(input, { ...copy, heading: "Olá {{nome}}" }),
    ).toThrow(/nome/)
  })
})
