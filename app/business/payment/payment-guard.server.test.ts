import { describe, it, expect, vi } from "vitest"

const mockEnv = vi.hoisted(() => ({ paymentSystemOnline: false }))

vi.mock("~/env.server", () => ({
  env: () => mockEnv,
}))

import { assertPaymentSystemOnline } from "./payment-guard.server"

describe("assertPaymentSystemOnline", () => {
  it("returns silently when payment system is online", () => {
    mockEnv.paymentSystemOnline = true
    expect(() => assertPaymentSystemOnline()).not.toThrow()
  })

  it("throws a redirect Response when payment system is offline", () => {
    mockEnv.paymentSystemOnline = false
    let thrown: unknown
    try {
      assertPaymentSystemOnline()
    } catch (e) {
      thrown = e
    }
    expect(thrown).toBeInstanceOf(Response)
    expect((thrown as Response).status).toBeGreaterThanOrEqual(300)
    expect((thrown as Response).status).toBeLessThan(400)
  })
})
