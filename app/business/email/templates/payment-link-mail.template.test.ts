import { describe, expect, it } from "vitest"
import type { PaymentOption } from "~/business/payment/pricing"
import { paymentLinkMailTemplate } from "./payment-link-mail.template"

const options: PaymentOption[] = [
  {
    id: "pix",
    method: "pix",
    installmentCount: null,
    perInstallment: 22199,
    total: 22199,
  },
  {
    id: "card_3",
    method: "credit_card",
    installmentCount: 3,
    perInstallment: 7818,
    total: 23454,
  },
]

const base = {
  displayName: "Ana",
  eventTitle: "Festa de Setembro",
  eventEmoji: "🎉",
  paymentUrl: "https://www.positivparty.com/pagamento/abc",
  dueAt: "2026-09-01T12:00:00Z",
  options,
}

describe("paymentLinkMailTemplate", () => {
  it("lists every option with its price", () => {
    const html = paymentLinkMailTemplate(base)

    expect(html).toContain("Pix — R$ 221,99")
    expect(html).toContain("Cartão 3x de R$ 78,18 (total R$ 234,54)")
  })

  it("links to the payment page", () => {
    const html = paymentLinkMailTemplate(base)

    expect(html).toContain('href="https://www.positivparty.com/pagamento/abc"')
  })

  it("shows the due date", () => {
    const html = paymentLinkMailTemplate(base)

    expect(html).toContain("01/09/2026")
  })

  it("names the person and the event", () => {
    const html = paymentLinkMailTemplate(base)

    expect(html).toContain("Ana")
    expect(html).toContain("Festa de Setembro")
  })

  it("escapes anything the participant typed", () => {
    const html = paymentLinkMailTemplate({
      ...base,
      displayName: '<script>alert("x")</script>',
    })

    expect(html).not.toContain("<script>")
  })

  it("cannot be talked out of its own href", () => {
    const html = paymentLinkMailTemplate({
      ...base,
      paymentUrl: 'https://www.positivparty.com/pagamento/abc" onclick="steal()',
    })

    expect(html).not.toContain('onclick="steal()"')
    expect(html).toContain("&quot;")
  })

  it("refuses a payment url that is not http(s)", () => {
    expect(() =>
      paymentLinkMailTemplate({ ...base, paymentUrl: "javascript:alert(1)" }),
    ).toThrow()
  })
})
