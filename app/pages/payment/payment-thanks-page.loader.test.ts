import { describe, expect, it, vi } from "vitest"
import * as authServer from "~/business/auth/auth.server"
import { defaultSettings } from "~/test/request-context"
import type { Route } from "./+types/payment-thanks-page"
import { loader } from "./payment-thanks-page"
import { loadPaymentPage } from "./payment-page.server"

vi.mock("~/business/auth/auth.server", () => ({
  getUserContext: vi.fn(),
}))

vi.mock("./payment-page.server", () => ({
  loadPaymentPage: vi.fn(async () => ({ state: "closed", eventTitle: "" })),
}))

describe("payment thanks page loader", () => {
  // Asaas sends the participant here after they paid. Switching online
  // payments off stops new charges, not the ones already paid: telling this
  // person the charge is closed would be telling them their money is lost.
  it("reads the charge as open even while online payments are off", async () => {
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

    expect(loadPaymentPage).toHaveBeenCalledWith({
      paymentId: "payment-1",
      profileId: "profile-1",
      onlinePaymentsEnabled: true,
    })
  })
})
