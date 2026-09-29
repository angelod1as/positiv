import { describe, expect, it } from "vitest"
import { nextRefundState, tallyRefunds } from "./refund-state"

describe("tallyRefunds", () => {
  it("counts only DONE as given back, as the Asaas docs say", () => {
    expect(
      tallyRefunds([
        { value: 117.15, status: "DONE" },
        { value: 108.51, status: "PENDING" },
      ]),
    ).toEqual({ done: 11715, pending: 10851, cancelled: 0 })
  })

  it("counts a refund waiting for an authorisation as still on its way", () => {
    expect(
      tallyRefunds([
        { value: 50, status: "AWAITING_CRITICAL_ACTION_AUTHORIZATION" },
        { value: 10, status: "AWAITING_CUSTOMER_EXTERNAL_AUTHORIZATION" },
      ]),
    ).toEqual({ done: 0, pending: 6000, cancelled: 0 })
  })

  it("keeps a cancelled refund apart", () => {
    expect(
      tallyRefunds([
        { value: 50, status: "DONE" },
        { value: 10, status: "CANCELLED" },
      ]),
    ).toEqual({ done: 5000, pending: 0, cancelled: 1000 })
  })

  it("does not count a refund of unknown status as money back", () => {
    expect(tallyRefunds([{ value: 20 }])).toEqual({
      done: 0,
      pending: 2000,
      cancelled: 0,
    })
  })
})

const base = {
  amount: 23430,
  previousRefunded: 0,
  requested: 22566,
  claimed: true,
  isPlan: true,
}

describe("nextRefundState", () => {
  it("is partially refunded while the rest of a plan's refund is on its way", () => {
    const state = nextRefundState({
      ...base,
      tally: { done: 11715, pending: 10851, cancelled: 0 },
    })

    expect(state).toEqual({
      status: "partially_refunded",
      refunded: 11715,
      pending: 10851,
      cancelled: 0,
      releaseClaim: false,
      tell: false,
    })
  })

  it("tells the participant once a plan reaches what was asked for", () => {
    const state = nextRefundState({
      ...base,
      previousRefunded: 11715,
      tally: { done: 22566, pending: 0, cancelled: 0 },
    })

    expect(state.status).toBe("partially_refunded")
    expect(state.tell).toBe(true)
    expect(state.releaseClaim).toBe(false)
  })

  it("does not tell twice when the same total is read again", () => {
    const state = nextRefundState({
      ...base,
      previousRefunded: 22566,
      tally: { done: 22566, pending: 0, cancelled: 0 },
    })

    expect(state.tell).toBe(false)
  })

  it("closes a payment given back whole as refunded", () => {
    const state = nextRefundState({
      ...base,
      requested: null,
      claimed: false,
      tally: { done: 23430, pending: 0, cancelled: 0 },
    })

    expect(state.status).toBe("refunded")
    expect(state.tell).toBe(true)
  })

  it("tells about every new refund on a single charge", () => {
    const state = nextRefundState({
      ...base,
      isPlan: false,
      requested: null,
      claimed: false,
      previousRefunded: 5000,
      tally: { done: 8000, pending: 0, cancelled: 0 },
    })

    expect(state.tell).toBe(true)
  })

  it("gives the claim back when Asaas cancelled what was left", () => {
    const state = nextRefundState({
      ...base,
      previousRefunded: 11715,
      tally: { done: 11715, pending: 0, cancelled: 10851 },
    })

    expect(state.status).toBe("partially_refunded")
    expect(state.releaseClaim).toBe(true)
    expect(state.tell).toBe(false)
  })

  it("keeps the claim right after the request, before Asaas lists anything", () => {
    const state = nextRefundState({
      ...base,
      tally: { done: 0, pending: 0, cancelled: 0 },
    })

    expect(state.status).toBe("paid")
    expect(state.releaseClaim).toBe(false)
  })

  it("never records more than was paid", () => {
    const state = nextRefundState({
      ...base,
      requested: null,
      claimed: false,
      tally: { done: 99999, pending: 0, cancelled: 0 },
    })

    expect(state.refunded).toBe(23430)
    expect(state.status).toBe("refunded")
  })
})
