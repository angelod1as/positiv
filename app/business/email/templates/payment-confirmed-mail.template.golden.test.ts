import { describe, expect, it, vi } from "vitest"
import { formatPaymentConfirmedMail } from "~/business/email/format-payment-confirmed-mail"
import { paymentConfirmedMailTemplate } from "./payment-confirmed-mail.template"

vi.mock("~/business/email/payment-confirmed-mail-copy.server", async () => {
  const { paymentConfirmedCopyFallback } = await import(
    "~/business/email/payment-confirmed-mail-copy"
  )
  return {
    loadPaymentConfirmedCopy: vi.fn(async () => paymentConfirmedCopyFallback),
  }
})

const input = {
  displayName: "Ana Souza",
  eventTitle: "Festa de Primavera",
  eventEmoji: "🌸",
  amount: 25000,
  method: "credit_card",
  installmentCount: 3,
  paidAt: "2026-12-01T15:00:00Z",
}

// The payment-confirmed email must render byte-for-byte as it did before its
// copy moved to Sanity. The snapshot and the subjects below are the pre-move
// output, captured once from the original code; never regenerate them (no `-u`).
describe("payment-confirmed email byte-for-byte", () => {
  it("renders the frozen HTML with the default copy", () => {
    expect(paymentConfirmedMailTemplate(input)).toMatchSnapshot()
  })

  it("renders the frozen HTML for a Pix payment", () => {
    expect(
      paymentConfirmedMailTemplate({
        ...input,
        eventEmoji: null,
        method: "pix",
        installmentCount: null,
      }),
    ).toMatchSnapshot()
  })

  it("keeps the frozen subject", async () => {
    expect((await formatPaymentConfirmedMail(input)).subject).toBe(
      "Pagamento confirmado - 🌸 Festa de Primavera",
    )
  })
})
