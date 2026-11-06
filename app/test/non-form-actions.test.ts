import { describe, expect, it, vi } from "vitest"

import { action as cpfAction } from "~/pages/api/payment/cpf"
import { action as dashboardAction } from "~/pages/dashboard/dashboard-page"
import { action as unsubscribeAction } from "~/pages/newsletter/unsubscribe"
import { action as paymentAction } from "~/pages/payment/payment-page"

vi.mock("~/lib/supabase/db.server", () => ({ db: {} }))

vi.mock("~/business/auth/auth.server", () => ({
  getContext: vi
    .fn()
    .mockResolvedValue({ currentProfile: { id: "profile-1" } }),
  getUserContext: vi
    .fn()
    .mockResolvedValue({ currentProfile: { id: "profile-1" } }),
}))

// The actions with no suite of their own. Each one reads the body before
// doing anything with it, so a JSON POST is turned away with 415.
const ACTIONS = [
  { name: "api/payment/cpf", action: cpfAction, params: {} },
  { name: "dashboard", action: dashboardAction, params: {} },
  { name: "newsletter/unsubscribe", action: unsubscribeAction, params: {} },
  {
    name: "payment",
    action: paymentAction,
    params: { paymentId: "3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c" },
  },
]

describe.each(ACTIONS)("$name action", ({ action, params }) => {
  it("answers a JSON body with 415", async () => {
    const run = action as (args: unknown) => Promise<unknown>

    const thrown = await run({
      request: new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      }),
      params,
    }).catch((error: unknown) => error)

    expect(thrown).toBeInstanceOf(Response)
    expect((thrown as Response).status).toBe(415)
  })
})
