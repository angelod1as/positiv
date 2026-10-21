import { beforeEach, describe, expect, it, vi } from "vitest"
import { buildPaymentOptions } from "~/business/payment/pricing"
import { formatPaymentLinkMail } from "./format-payment-link-mail"
import { paymentLinkCopyFallback } from "./payment-link-mail-copy"
import { loadPaymentLinkCopy } from "./payment-link-mail-copy.server"

vi.mock("~/lib/logger/logger.server", () => ({
  logger: {
    error: vi.fn(),
    child() {
      return this
    },
  },
}))
vi.mock("./payment-link-mail-copy.server", () => ({
  loadPaymentLinkCopy: vi.fn(),
}))

const copy = {
  subject: "Seu pagamento da {{evento}}",
  heading: "Hora de garantir sua vaga",
  bodyParagraphs: ["Oi {{nome}}!"],
}

const input = {
  displayName: "Ana",
  eventTitle: "Festa de Setembro",
  eventEmoji: "🎉",
  paymentUrl: "https://www.positivparty.com/pagamento/abc",
  dueAt: "2026-09-01T12:00:00Z",
  options: buildPaymentOptions(22000, { cardEnabled: true }),
}

beforeEach(() => {
  vi.mocked(loadPaymentLinkCopy).mockResolvedValue(copy)
})

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

  // The trailing space is intentional: it matches the pre-move subject exactly
  // for the case where a payment has neither an event title nor an emoji.
  it("leaves the event out of the subject when there is no title or emoji", async () => {
    const { subject } = await formatPaymentLinkMail({
      ...input,
      eventTitle: "",
      eventEmoji: null,
    })

    expect(subject).toBe("Seu pagamento da ")
  })

  it("keeps the subject plain, with no HTML entities, for an event title with &", async () => {
    const { subject } = await formatPaymentLinkMail({
      ...input,
      eventEmoji: null,
      eventTitle: "Jazz & Blues",
    })

    expect(subject).toBe("Seu pagamento da Jazz & Blues")
    expect(subject).not.toContain("&amp;")
    expect(subject).not.toContain("&nbsp;")
  })

  it("falls back to the code copy when the CMS copy fails to render", async () => {
    vi.mocked(loadPaymentLinkCopy).mockResolvedValueOnce({
      subject: "Seu pagamento da {{evento}}",
      heading: "Hora de garantir sua vaga",
      bodyParagraphs: ["Oi {{boleto}}!"],
    })

    const { html } = await formatPaymentLinkMail(input)

    expect(html).toContain("está reservada!")
    expect(html).not.toContain("boleto")
  })

  it("propagates a real render error when the code copy is already in use", async () => {
    vi.mocked(loadPaymentLinkCopy).mockResolvedValueOnce(paymentLinkCopyFallback)

    await expect(
      formatPaymentLinkMail({ ...input, paymentUrl: "javascript:alert(1)" }),
    ).rejects.toThrow()
  })
})
