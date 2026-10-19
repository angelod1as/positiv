import { describe, expect, it } from "vitest"
import { paymentRefundMailCopy } from "~/copy/emails/payment-refund"
import { paymentRefundMailTemplate } from "./payment-refund-mail.template"

const input = {
  displayName: "Ana Souza",
  eventTitle: "Festa de Primavera",
  eventEmoji: "🌸",
  refundAmount: 20000,
  amount: 25000,
  method: "credit_card",
  kind: "online" as const,
}

// The payment-refund email must render byte-for-byte as it did before its copy
// moved to Sanity. The snapshots and the subject below are the pre-move output,
// captured once from the original code; never regenerate them (no `-u`).
describe("payment-refund email byte-for-byte", () => {
  it("renders the frozen HTML for a partial card refund", () => {
    expect(paymentRefundMailTemplate(input)).toMatchSnapshot()
  })

  it("renders the frozen HTML for a full manual refund", () => {
    expect(
      paymentRefundMailTemplate({
        ...input,
        eventEmoji: null,
        refundAmount: 25000,
        method: "pix",
        kind: "manual",
      }),
    ).toMatchSnapshot()
  })

  it("keeps the frozen subject", () => {
    expect(paymentRefundMailCopy.subject("🌸 Festa de Primavera")).toBe(
      "Reembolso - 🌸 Festa de Primavera",
    )
  })
})
