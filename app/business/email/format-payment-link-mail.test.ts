import { describe, expect, it, vi } from "vitest"
import { buildPaymentOptions } from "~/business/payment/pricing"
import { formatPaymentLinkMail } from "./format-payment-link-mail"

vi.mock("./payment-link-mail-copy.server", () => ({
  loadPaymentLinkCopy: vi.fn(async () => ({
    subject: "Seu pagamento da {{evento}}",
    heading: "Hora de garantir sua vaga",
    bodyParagraphs: ["Oi {{nome}}!"],
  })),
}))

const input = {
  displayName: "Ana",
  eventTitle: "Festa de Setembro",
  eventEmoji: "🎉",
  paymentUrl: "https://www.positivparty.com/pagamento/abc",
  dueAt: "2026-09-01T12:00:00Z",
  options: buildPaymentOptions(22000, { cardEnabled: true }),
}

describe("formatPaymentLinkMail", () => {
  it("builds the subject from the copy, with the event in it", async () => {
    const { subject } = await formatPaymentLinkMail(input)

    expect(subject).toBe("Seu pagamento da 🎉 Festa de Setembro")
  })

  it("renders the html body from the copy and a plain-text part", async () => {
    const { html, text } = await formatPaymentLinkMail(input)

    expect(html).toContain("Oi Ana!")
    expect(text).toContain("Oi Ana!")
  })

  it("leaves the event out of the subject when there is no title or emoji", async () => {
    const { subject } = await formatPaymentLinkMail({
      ...input,
      eventTitle: "",
      eventEmoji: null,
    })

    expect(subject).toBe("Seu pagamento da ")
  })
})
