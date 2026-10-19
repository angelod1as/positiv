import { beforeEach, describe, expect, it, vi } from "vitest"
import { formatPaymentConfirmedMail } from "./format-payment-confirmed-mail"
import { paymentConfirmedCopyFallback } from "./payment-confirmed-mail-copy"
import { loadPaymentConfirmedCopy } from "./payment-confirmed-mail-copy.server"

vi.mock("~/lib/logger/logger.server", () => ({ logger: { error: vi.fn() } }))
vi.mock("./payment-confirmed-mail-copy.server", () => ({
  loadPaymentConfirmedCopy: vi.fn(),
}))

const input = {
  displayName: "Ana",
  eventTitle: "Jazz & Blues",
  eventEmoji: "🎷",
  amount: 22000,
  method: "pix",
  installmentCount: null,
  paidAt: "2026-09-01T12:00:00Z",
}

beforeEach(() => {
  vi.mocked(loadPaymentConfirmedCopy).mockResolvedValue({
    ...paymentConfirmedCopyFallback,
    subject: "Pago: {{evento}}",
    bodyParagraphs: ["Oi {{nome}}!"],
  })
})

describe("formatPaymentConfirmedMail", () => {
  it("builds a plain subject from the copy, with the event in it", async () => {
    const { subject } = await formatPaymentConfirmedMail(input)

    expect(subject).toBe("Pago: 🎷 Jazz & Blues")
  })

  it("leaves the emoji out of the subject when the event has none", async () => {
    const { subject } = await formatPaymentConfirmedMail({
      ...input,
      eventEmoji: null,
    })

    expect(subject).toBe("Pago: Jazz & Blues")
  })

  it("renders the html body from the copy and a plain-text part", async () => {
    const { html, text } = await formatPaymentConfirmedMail(input)

    expect(html).toContain("Oi Ana!")
    expect(text).toContain("Oi Ana!")
  })

  it("falls back to the code copy when the CMS copy fails to render", async () => {
    vi.mocked(loadPaymentConfirmedCopy).mockResolvedValueOnce({
      ...paymentConfirmedCopyFallback,
      bodyParagraphs: ["Oi {{boleto}}!"],
    })

    const { html, subject } = await formatPaymentConfirmedMail(input)

    expect(html).toContain("Sua vaga está garantida!")
    expect(html).not.toContain("boleto")
    expect(subject).toBe("Pagamento confirmado - 🎷 Jazz & Blues")
  })
})
