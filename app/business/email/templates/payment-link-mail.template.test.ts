import { describe, expect, it } from "vitest"
import { paymentLinkOptions } from "./payment-link-mail.fixture"
import {
  type PaymentLinkMailOption,
  paymentLinkMailTemplate,
} from "./payment-link-mail.template"

const options = paymentLinkOptions({ pix: 19800, card: 22000 })

const base = {
  displayName: "Ana",
  eventTitle: "Festa de Setembro",
  eventEmoji: "🎉",
  paymentUrl: "https://www.positivparty.com/pagamento/abc",
  dueAt: "2026-09-01T12:00:00Z",
  options,
  pixDiscountPercent: 10,
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
        options: paymentLinkOptions({ pix: 22000 }),
      }),
    )

    expect(html).toContain("No Pix: <strong>R$ 220,00</strong>")
    expect(html).not.toContain("desconto")
    expect(html).not.toContain("cartão")
  })

  it("states the Pix discount the caller gives it", () => {
    const html = textOf(
      paymentLinkMailTemplate({ ...base, pixDiscountPercent: 15 }),
    )

    expect(html).toContain("No Pix (15% de desconto)")
  })

  // A resend after the participant picked restates that one choice.
  it("restates a card plan already chosen", () => {
    const chosen: PaymentLinkMailOption[] = [
      { method: "credit_card", installmentCount: 3, total: 22000 },
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

describe("paymentLinkMailTemplate links", () => {
  it("tags every link to the site with the e-mail UTMs", () => {
    const html = paymentLinkMailTemplate(base)
    const siteLinks = [
      ...html.matchAll(/href="(https:\/\/www\.positivparty\.com[^"]*)"/g),
    ]
      .map(([, href]) => href)
      .filter((href) => href !== base.paymentUrl)

    expect(siteLinks.length).toBeGreaterThan(0)
    for (const href of siteLinks) {
      expect(href).toContain(
        "utm_source=email&amp;utm_medium=transactional&amp;utm_campaign=payment-link",
      )
    }
  })
})
