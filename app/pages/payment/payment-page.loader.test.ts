import { beforeEach, describe, expect, it, vi } from "vitest"
import * as authServer from "~/business/auth/auth.server"
import { defaultSettings } from "~/test/request-context"
import type { Route } from "./+types/payment-page"
import { loader } from "./payment-page"
import { loadPaymentPage } from "./payment-page.server"

vi.mock("~/business/auth/auth.server", () => ({
  getUserContext: vi.fn(),
}))

vi.mock("./payment-page.server", () => ({
  loadPaymentPage: vi.fn(async () => ({ state: "closed", eventTitle: "" })),
}))

const contextWith = (enabled: boolean) =>
  ({
    currentUser: { id: "user-1", email: "ana@example.com" },
    currentProfile: { id: "profile-1" },
    settings: {
      onlinePayments: { ...defaultSettings.onlinePayments, enabled },
    },
  }) as unknown as Awaited<ReturnType<typeof authServer.getUserContext>>

const load = () =>
  loader({
    request: new Request("http://localhost/pagamento/payment-1"),
    params: { paymentId: "payment-1" },
    context: {},
  } as unknown as Route.LoaderArgs)

describe("payment page loader", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each([true, false])(
    "hands the page the online payments switch from the request context (%s)",
    async (enabled) => {
      vi.mocked(authServer.getUserContext).mockResolvedValue(
        contextWith(enabled),
      )

      await load()

      expect(loadPaymentPage).toHaveBeenCalledWith({
        paymentId: "payment-1",
        profileId: "profile-1",
        onlinePaymentsEnabled: enabled,
      })
    },
  )
})
