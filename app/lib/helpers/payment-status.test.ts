import { describe, expect, it } from "vitest"
import {
  countsTowardsFinances,
  holdsPayment,
  isSettledPayment,
  paymentStatusFilterValue,
} from "./payment-status"

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

describe("paymentStatusFilterValue", () => {
  it("gives a participant with no payment a value of their own", () => {
    expect(paymentStatusFilterValue({ payment_status: null })).toBe("none")
    expect(paymentStatusFilterValue(undefined)).toBe("none")
  })

  it("passes a real status through untouched", () => {
    expect(paymentStatusFilterValue({ payment_status: "paid" })).toBe("paid")
    expect(paymentStatusFilterValue({ payment_status: "awaiting_payment" })).toBe(
      "awaiting_payment",
    )
  })
})

describe("countsTowardsFinances", () => {
  it("counts an event from the day the platform launched", () => {
    expect(countsTowardsFinances("2025-05-20T00:00:00-03:00")).toBe(true)
    expect(countsTowardsFinances("2025-06-21T22:00:00-03:00")).toBe(true)
  })

  it("leaves out an event imported from before the launch", () => {
    expect(countsTowardsFinances("2025-05-17T22:00:00-03:00")).toBe(false)
    expect(countsTowardsFinances("2023-02-25T22:00:00")).toBe(false)
    expect(countsTowardsFinances("2025-05-19T23:59:59-03:00")).toBe(false)
  })

  it("leaves out an event with no date", () => {
    expect(countsTowardsFinances(null)).toBe(false)
  })
})
