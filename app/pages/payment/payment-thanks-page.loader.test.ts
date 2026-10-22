import { describe, expect, it, vi } from "vitest"
import * as authServer from "~/business/auth/auth.server"
import type { Route } from "./+types/payment-thanks-page"
import { loader } from "./payment-thanks-page"
import { loadPaymentThanks } from "./payment-page.server"
import { isOnlinePaymentsEnabled } from "~/business/settings/app-settings.server"

vi.mock("~/business/auth/auth.server", () => ({
  getUserContext: vi.fn(),
}))

vi.mock("~/business/settings/app-settings.server", () => ({
  isOnlinePaymentsEnabled: vi.fn(),
}))

vi.mock("./payment-page.server", () => ({
  loadPaymentThanks: vi.fn(async () => ({ state: "waiting", eventTitle: "" })),
}))

describe("payment thanks page loader", () => {
  const signIn = () =>
    vi.mocked(authServer.getUserContext).mockResolvedValue({
      currentUser: { id: "user-1", email: "ana@example.com" },
      currentProfile: { id: "profile-1" },
    } as unknown as Awaited<ReturnType<typeof authServer.getUserContext>>)

  const load = () =>
    loader({
      request: new Request(
        "http://localhost/pagamento/3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c/obrigado",
      ),
      params: { paymentId: "3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c" },
      context: {},
    } as unknown as Route.LoaderArgs)

  // Asaas sends the participant here after they paid. Switching online
  // payments off stops new charges, not the ones already paid, so the charge
  // is read whatever the switch says.
  it("reads the charge without consulting the online payments switch", async () => {
    signIn()
    vi.mocked(isOnlinePaymentsEnabled).mockResolvedValue(false)

    await load()

    expect(loadPaymentThanks).toHaveBeenCalledWith({
      paymentId: "3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c",
      profileId: "profile-1",
    })
  })
  it.each([true, false])(
    "shows the beta notice only while online payments are on (%s)",
    async (enabled) => {
      signIn()
      vi.mocked(isOnlinePaymentsEnabled).mockResolvedValue(enabled)

      expect(await load()).toMatchObject({ betaNotice: enabled })
    },
  )
})
