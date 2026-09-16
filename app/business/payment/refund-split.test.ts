import { describe, expect, it } from "vitest"
import { splitRefund } from "./refund-split"

const sum = (shares: { amount: number }[]) =>
  shares.reduce((total, share) => total + share.amount, 0)

describe("splitRefund", () => {
  it("splits proportionally to what each charge billed", () => {
    expect(
      splitRefund(21900, [
        { id: "pay_1", value: 7877 },
        { id: "pay_2", value: 7877 },
        { id: "pay_3", value: 7877 },
      ]),
    ).toEqual([
      { id: "pay_1", amount: 7300 },
      { id: "pay_2", amount: 7300 },
      { id: "pay_3", amount: 7300 },
    ])
  })

  it("gives the rounding remainder to the last charge", () => {
    const split = splitRefund(10000, [
      { id: "pay_1", value: 5000 },
      { id: "pay_2", value: 5001 },
    ])

    expect(split).toEqual([
      { id: "pay_1", amount: 4999 },
      { id: "pay_2", amount: 5001 },
    ])
    expect(sum(split)).toBe(10000)
  })

  it("never asks a charge for more than it billed", () => {
    const split = splitRefund(1001, [
      { id: "pay_1", value: 1000 },
      { id: "pay_2", value: 1 },
      { id: "pay_3", value: 1 },
    ])

    // The remainder does not fit on the last charge alone, so it walks back
    // up the plan until every cent has somewhere to go.
    expect(split).toEqual([
      { id: "pay_1", amount: 999 },
      { id: "pay_2", amount: 1 },
      { id: "pay_3", amount: 1 },
    ])
    expect(sum(split)).toBe(1001)
  })

  it("leaves out a charge whose share rounds to nothing", () => {
    expect(
      splitRefund(1, [
        { id: "pay_1", value: 100 },
        { id: "pay_2", value: 100 },
      ]),
    ).toEqual([{ id: "pay_2", amount: 1 }])
  })

  it("refuses to give back more than the plan billed", () => {
    expect(() => splitRefund(20000, [{ id: "pay_1", value: 1000 }])).toThrow()
  })

  it("refuses a plan with nothing to refund", () => {
    expect(() => splitRefund(100, [])).toThrow()
  })
})
