import { describe, expect, it } from "vitest"
import { holdsPayment, isSettledPayment } from "./payment-status"

describe("isSettledPayment", () => {
  it("says money changed hands, whatever happened after", () => {
    expect(isSettledPayment("paid")).toBe(true)
    expect(isSettledPayment("partially_refunded")).toBe(true)
    expect(isSettledPayment("refunded")).toBe(true)
  })

  it("refuses a charge that was never collected", () => {
    expect(isSettledPayment("pending")).toBe(false)
    expect(isSettledPayment("awaiting_payment")).toBe(false)
    expect(isSettledPayment("expired")).toBe(false)
    expect(isSettledPayment("cancelled")).toBe(false)
  })

  it("refuses a participation with no payment at all", () => {
    expect(isSettledPayment(null)).toBe(false)
    expect(isSettledPayment(undefined)).toBe(false)
  })
})

describe("holdsPayment", () => {
  it("answers false once the money went back in full", () => {
    expect(holdsPayment("paid")).toBe(true)
    expect(holdsPayment("partially_refunded")).toBe(true)
    expect(holdsPayment("refunded")).toBe(false)
    expect(holdsPayment(null)).toBe(false)
  })
})
