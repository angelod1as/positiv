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

  it("throws a 302 redirect Response to the dashboard when payment system is offline", () => {
    mockEnv.paymentSystemOnline = false
    let thrown: unknown
    try {
      assertPaymentSystemOnline()
    } catch (e) {
      thrown = e
    }
    expect(thrown).toBeInstanceOf(Response)
    // React Router's `redirect()` defaults to 302. Pinning the exact status
    // catches accidental swaps (e.g. to a 4xx error response).
    expect((thrown as Response).status).toBe(302)
    expect((thrown as Response).headers.get("Location")).toBe("/dashboard")
  })
})
