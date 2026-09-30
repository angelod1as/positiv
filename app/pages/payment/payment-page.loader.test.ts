import { beforeEach, describe, expect, it, vi } from "vitest"
import * as authServer from "~/business/auth/auth.server"
import {
  isCardPaymentsEnabled,
  isOnlinePaymentsEnabled,
} from "~/business/settings/app-settings.server"
import type { Route } from "./+types/payment-page"
import { loader } from "./payment-page"
import { loadPaymentPage } from "./payment-page.server"

vi.mock("~/business/auth/auth.server", () => ({
  getUserContext: vi.fn(),
}))

vi.mock("~/business/settings/app-settings.server", () => ({
  isCardPaymentsEnabled: vi.fn(),
  isOnlinePaymentsEnabled: vi.fn(),
}))

vi.mock("./payment-page.server", () => ({
  loadPaymentPage: vi.fn(async () => ({ state: "closed", eventTitle: "" })),
}))

const context = {
  currentUser: { id: "user-1", email: "ana@example.com" },
  currentProfile: { id: "profile-1" },
} as unknown as Awaited<ReturnType<typeof authServer.getUserContext>>

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
    "hands the page the online and card payments switches (%s)",
    async (enabled) => {
      vi.mocked(authServer.getUserContext).mockResolvedValue(context)
      vi.mocked(isOnlinePaymentsEnabled).mockResolvedValue(enabled)
      vi.mocked(isCardPaymentsEnabled).mockResolvedValue(!enabled)

      await load()

      expect(loadPaymentPage).toHaveBeenCalledWith({
        paymentId: "payment-1",
        profileId: "profile-1",
        onlinePaymentsEnabled: enabled,
        cardPaymentsEnabled: !enabled,
      })
    },
  )
})
