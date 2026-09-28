import { describe, expect, it, vi } from "vitest"
import * as authServer from "~/business/auth/auth.server"
import { defaultSettings } from "~/test/request-context"
import type { Route } from "./+types/payment-thanks-page"
import { loader } from "./payment-thanks-page"
import { loadPaymentThanks } from "./payment-page.server"

vi.mock("~/business/auth/auth.server", () => ({
  getUserContext: vi.fn(),
}))

vi.mock("./payment-page.server", () => ({
  loadPaymentThanks: vi.fn(async () => ({ state: "waiting", eventTitle: "" })),
}))

describe("payment thanks page loader", () => {
  // Asaas sends the participant here after they paid. Switching online
  // payments off stops new charges, not the ones already paid, so the page
  // reads the charge without asking about the switch at all.
  it("reads the charge without consulting the online payments switch", async () => {
    vi.mocked(authServer.getUserContext).mockResolvedValue({
      currentUser: { id: "user-1", email: "ana@example.com" },
      currentProfile: { id: "profile-1" },
      settings: defaultSettings,
    } as unknown as Awaited<ReturnType<typeof authServer.getUserContext>>)

    await loader({
      request: new Request("http://localhost/pagamento/payment-1/obrigado"),
      params: { paymentId: "payment-1" },
      context: {},
    } as unknown as Route.LoaderArgs)

    expect(loadPaymentThanks).toHaveBeenCalledWith({
      paymentId: "payment-1",
      profileId: "profile-1",
    })
  })
})
