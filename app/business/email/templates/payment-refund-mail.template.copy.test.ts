import { describe, expect, it } from "vitest"
import type { PaymentRefundCopy } from "~/business/email/payment-refund-mail-copy"
import { paymentRefundMailTemplate } from "./payment-refund-mail.template"

const input = {
  displayName: "Ana",
  eventTitle: "Festa",
  eventEmoji: "🎉",
  refundAmount: 22000,
  amount: 22000,
  method: "pix",
  kind: "online" as const,
}

const copy: PaymentRefundCopy = {
  subject: "Devolvido: {{evento}}",
  heading: "Dinheiro de volta",
  bodyParagraphs: ["Oi {{nome}}, devolvemos a <strong>{{evento}}</strong>."],
  cta: "Abrir painel",
}

describe("paymentRefundMailTemplate with copy from the CMS", () => {
  it("renders the copy it is given, filling the placeholders", () => {
    const html = paymentRefundMailTemplate(input, copy)

    expect(html).toContain("Dinheiro de volta")
    expect(html).toContain("Oi Ana, devolvemos a <strong>🎉&nbsp;Festa</strong>.")
    expect(html).toContain("Abrir painel")
  })

  it("HTML-escapes the heading and button an Editor typed", () => {
    const html = paymentRefundMailTemplate(input, {
      ...copy,
      heading: "Ofertas & novidades",
      cta: "<b>Ir</b>",
    })

    expect(html).toContain("Ofertas &amp; novidades")
    expect(html).toContain("&lt;b&gt;Ir&lt;/b&gt;")
  })

  it("HTML-escapes a value so a participant cannot inject markup", () => {
    const html = paymentRefundMailTemplate(
      { ...input, displayName: '<img src=x onerror="steal()">' },
      copy,
    )

    expect(html).not.toContain("onerror")
  })

  it("throws on a body placeholder outside the whitelist", () => {
    expect(() =>
      paymentRefundMailTemplate(input, {
        ...copy,
        bodyParagraphs: ["Pague em {{boleto}}."],
      }),
    ).toThrow(/boleto/)
  })

  it("throws on a placeholder in the button", () => {
    expect(() =>
      paymentRefundMailTemplate(input, { ...copy, cta: "{{nome}}" }),
    ).toThrow(/nome/)
  })
})
