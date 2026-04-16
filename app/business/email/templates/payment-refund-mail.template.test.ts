import { describe, it, expect } from "vitest"
import { paymentRefundMailTemplate } from "./payment-refund-mail.template"

const baseParams = {
  participantName: "João",
  eventName: "Positiv Regular",
  refundAmount: 220,
}

describe("paymentRefundMailTemplate", () => {
  it("includes participant name", () => {
    const html = paymentRefundMailTemplate(baseParams)
    expect(html).toContain("João")
  })

  it("includes event name", () => {
    const html = paymentRefundMailTemplate(baseParams)
    expect(html).toContain("Positiv Regular")
  })

  it("includes formatted refund amount", () => {
    const html = paymentRefundMailTemplate(baseParams)
    expect(html).toContain("R$")
    expect(html).toContain("220")
  })

  it("sanitizes participant name against XSS", () => {
    const html = paymentRefundMailTemplate({
      ...baseParams,
      participantName: "<script>alert('xss')</script>",
    })
    expect(html).not.toContain("<script>")
  })

  it("sanitizes event name against XSS", () => {
    const html = paymentRefundMailTemplate({
      ...baseParams,
      eventName: '<img onerror="alert(1)">',
    })
    expect(html).not.toContain("onerror")
  })
})
