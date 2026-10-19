import { describe, expect, it } from "vitest"
import { buildPaymentOptions } from "~/business/payment/pricing"
import { paymentLinkMailTemplate } from "./payment-link-mail.template"

const input = {
  displayName: "Ana Souza",
  eventTitle: "Festa de Primavera",
  eventEmoji: "🌸",
  paymentUrl: "https://www.positivparty.com/pagamento/abc-123",
  dueAt: "2026-12-31T12:00:00Z",
  options: buildPaymentOptions(25000, { cardEnabled: true }),
}

// The payment-link email must render byte-for-byte as it did before its copy
// moved to Sanity. This snapshot is the pre-move output: it is captured once
// from the original template and must never be regenerated (no `-u`). After the
// copy moves, rendering with the default (fallback) copy has to reproduce it
// exactly, which is what proves the move changed nothing a recipient sees.
describe("paymentLinkMailTemplate byte-for-byte", () => {
  it("renders the frozen HTML with the default copy", () => {
    expect(paymentLinkMailTemplate(input)).toMatchSnapshot()
  })
})
