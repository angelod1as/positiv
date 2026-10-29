import { describe, expect, it } from "vitest"
import type { PaymentConfirmedCopy } from "~/business/email/payment-confirmed-mail-copy"
import { paymentConfirmedMailTemplate } from "./payment-confirmed-mail.template"

const input = {
  displayName: "Ana",
  eventTitle: "Festa",
  eventEmoji: "🎉",
  amount: 22000,
  method: "pix",
  installmentCount: null,
  perInstallment: null,
  paidAt: "2026-09-01T12:00:00Z",
}

const copy: PaymentConfirmedCopy = {
  subject: "Pago: {{evento}}",
  heading: "Tudo certo!",
  bodyParagraphs: ["Oi {{nome}}, te vemos na <strong>{{evento}}</strong>."],
  cta: "Abrir painel",
  closingParagraphs: ["Até <em>logo</em>.", "Beijos."],
}

describe("paymentConfirmedMailTemplate with copy from the CMS", () => {
  it("renders the copy it is given, filling the placeholders", () => {
    const html = paymentConfirmedMailTemplate(input, copy)

    expect(html).toContain("Tudo certo!")
    expect(html).toContain("Oi Ana, te vemos na <strong>🎉&nbsp;Festa</strong>.")
    expect(html).toContain("Abrir painel")
    expect(html).toContain("Até <em>logo</em>.")
    expect(html).toContain("Beijos.")
  })

  it("HTML-escapes the heading and button an Editor typed", () => {
    const html = paymentConfirmedMailTemplate(input, {
      ...copy,
      heading: "Ofertas & novidades",
      cta: "<b>Ir</b>",
    })

    expect(html).toContain("Ofertas &amp; novidades")
    expect(html).toContain("&lt;b&gt;Ir&lt;/b&gt;")
  })

  it("HTML-escapes a value so a participant cannot inject markup", () => {
    const html = paymentConfirmedMailTemplate(
      { ...input, displayName: '<img src=x onerror="steal()">' },
      copy,
    )

    expect(html).not.toContain("onerror")
  })

  it("throws on a body placeholder outside the whitelist", () => {
    expect(() =>
      paymentConfirmedMailTemplate(input, {
        ...copy,
        bodyParagraphs: ["Pague em {{boleto}}."],
      }),
    ).toThrow(/boleto/)
  })

  it("throws on a placeholder in the closing", () => {
    expect(() =>
      paymentConfirmedMailTemplate(input, {
        ...copy,
        closingParagraphs: ["{{nome}}"],
      }),
    ).toThrow(/nome/)
  })
})
