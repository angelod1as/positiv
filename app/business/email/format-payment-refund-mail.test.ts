import { beforeEach, describe, expect, it, vi } from "vitest"
import { formatPaymentRefundMail } from "./format-payment-refund-mail"
import { paymentRefundCopyFallback } from "./payment-refund-mail-copy"
import { loadPaymentRefundCopy } from "./payment-refund-mail-copy.server"

vi.mock("~/lib/logger/logger.server", () => ({ logger: { error: vi.fn() } }))
vi.mock("./payment-refund-mail-copy.server", () => ({
  loadPaymentRefundCopy: vi.fn(),
}))

const input = {
  displayName: "Ana",
  eventTitle: "Jazz & Blues",
  eventEmoji: "🎷",
  refundAmount: 22000,
  amount: 22000,
  method: "pix",
  kind: "online" as const,
}

beforeEach(() => {
  vi.mocked(loadPaymentRefundCopy).mockResolvedValue({
    ...paymentRefundCopyFallback,
    subject: "Devolvido: {{evento}}",
    bodyParagraphs: ["Oi {{nome}}!"],
  })
})

describe("formatPaymentRefundMail", () => {
  it("builds a plain subject from the copy, with the event in it", async () => {
    const { subject } = await formatPaymentRefundMail(input)

    expect(subject).toBe("Devolvido: 🎷 Jazz & Blues")
  })

  it("leaves the emoji out of the subject when the event has none", async () => {
    const { subject } = await formatPaymentRefundMail({
      ...input,
      eventEmoji: null,
    })

    expect(subject).toBe("Devolvido: Jazz & Blues")
  })

  it("renders the html body from the copy and a plain-text part", async () => {
    const { html, text } = await formatPaymentRefundMail(input)

    expect(html).toContain("Oi Ana!")
    expect(text).toContain("Oi Ana!")
  })

  it("falls back to the code copy when the CMS copy fails to render", async () => {
    vi.mocked(loadPaymentRefundCopy).mockResolvedValueOnce({
      ...paymentRefundCopyFallback,
      bodyParagraphs: ["Oi {{boleto}}!"],
    })

    const { html, subject } = await formatPaymentRefundMail(input)

    expect(html).toContain("foi confirmado.")
    expect(html).not.toContain("boleto")
    expect(subject).toBe("Reembolso - 🎷 Jazz & Blues")
  })
})
