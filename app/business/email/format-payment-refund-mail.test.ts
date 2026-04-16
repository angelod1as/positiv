import { describe, it, expect } from "vitest"
import { formatPaymentRefundMail } from "./format-payment-refund-mail"

describe("formatPaymentRefundMail", () => {
  it("returns html and text versions", () => {
    const result = formatPaymentRefundMail({
      participantName: "João",
      eventName: "Positiv Regular",
      refundAmount: 220,
    })

    expect(result.html).toContain("João")
    expect(result.text).toContain("João")
  })
})
