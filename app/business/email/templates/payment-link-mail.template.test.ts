import { describe, expect, it } from "vitest"
import {
  buildPaymentOptions,
  type PaymentOption,
} from "~/business/payment/pricing"
import { paymentLinkMailTemplate } from "./payment-link-mail.template"

const options = buildPaymentOptions(22000, { cardEnabled: true })

const base = {
  displayName: "Ana",
  eventTitle: "Festa de Setembro",
  eventEmoji: "🎉",
  paymentUrl: "https://www.positivparty.com/pagamento/abc",
  dueAt: "2026-09-01T12:00:00Z",
  options,
}

describe("paymentLinkMailTemplate", () => {
  const textOf = (html: string) => html.replace(/\s+/g, " ")

  it("says the spot is reserved and one step is left", () => {
    const html = textOf(paymentLinkMailTemplate(base))

    expect(html).toContain("sua vaga na <strong>🎉&nbsp;Festa de Setembro</strong> está reservada!")
    expect(html).toContain("Para garanti-la, só falta um passo: o pagamento.")
    expect(html).not.toContain("Escolha como prefere pagar")
    expect(html).not.toContain("Formas de pagamento")
  })

  it("sums up Pix with its discount in bold and the card from 1x to 6x", () => {
    const html = textOf(paymentLinkMailTemplate(base))

    expect(html).toContain("No Pix (10% de desconto): <strong>R$ 198,00</strong>")
    expect(html).toContain("No cartão de crédito (1x a 6x sem juros): R$ 220,00")
    expect(html).not.toContain("Cartão 3x")
  })

  it("offers Pix alone, with no discount, while card payments are off", () => {
    const html = textOf(
      paymentLinkMailTemplate({
        ...base,
        options: buildPaymentOptions(22000, { cardEnabled: false }),
      }),
    )

    expect(html).toContain("No Pix: <strong>R$ 220,00</strong>")
    expect(html).not.toContain("desconto")
    expect(html).not.toContain("cartão")
  })

  // A resend after the participant picked restates that one choice.
  it("restates a card plan already chosen", () => {
    const chosen: PaymentOption[] = [
      {
        id: "card_3",
        method: "credit_card",
        installmentCount: 3,
        perInstallment: 7333,
        total: 22000,
      },
    ]
    const html = textOf(paymentLinkMailTemplate({ ...base, options: chosen }))

    expect(html).toContain("No cartão de crédito (3x sem juros): R$ 220,00")
    expect(html).not.toContain("Pix")
  })

  it("puts the summary before the button", () => {
    const html = paymentLinkMailTemplate(base)

    expect(html.indexOf("No Pix")).toBeLessThan(html.indexOf("Pagar agora"))
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

  it("sizes to its content", () => {
    const html = paymentLinkMailTemplate(base)

    // Clients render mail in an iframe sized to its content, so 100vh feeds
    // back into the iframe height and leaves a huge empty scroll.
    expect(html).not.toContain("100vh")
  })
})
