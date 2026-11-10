import { describe, expect, it, vi } from "vitest"
import * as authServer from "~/business/auth/auth.server"
import { isOnlinePaymentsEnabled } from "~/business/settings/app-settings.server"
import type { Route } from "./+types/payment-token-thanks-page"
import { headers, loader, meta } from "./payment-token-thanks-page"
import { loadPaymentThanksByToken } from "~/business/payment/payment-page.server"

vi.mock("~/business/auth/auth.server", () => ({
  getContext: vi.fn(),
  getUserContext: vi.fn(),
}))

vi.mock("~/business/settings/app-settings.server", () => ({
  isOnlinePaymentsEnabled: vi.fn(),
}))

vi.mock("~/business/payment/payment-page.server", () => ({
  loadPaymentThanksByToken: vi.fn(async () => ({
    state: "waiting",
    eventTitle: "",
  })),
}))

const token = "b".repeat(48)

const load = () =>
  loader({
    request: new Request(`http://localhost/pagamento/t/${token}/obrigado`),
    params: { token },
    context: {},
  } as unknown as Route.LoaderArgs)

describe("payment token thanks page", () => {
  // Asaas sends every payer here, signed in or not, so the page cannot ask
  // who they are.
  it("reads the charge from the token alone, never from the session", async () => {
    vi.mocked(isOnlinePaymentsEnabled).mockResolvedValue(true)

    expect(await load()).toMatchObject({
      state: "waiting",
      betaNotice: true,
      viaToken: true,
    })
    expect(loadPaymentThanksByToken).toHaveBeenCalledWith({ token })
    expect(authServer.getUserContext).not.toHaveBeenCalled()
    expect(authServer.getContext).not.toHaveBeenCalled()
  })

  it("keeps the link out of referrers and caches", () => {
    const sent = new Headers(headers({} as Route.HeadersArgs))

    expect(sent.get("Referrer-Policy")).toBe("no-referrer")
    expect(sent.get("Cache-Control")).toBe("private, no-store")
  })

  it("asks search engines not to index the page", () => {
    expect(meta({} as Route.MetaArgs)).toContainEqual({
      name: "robots",
      content: "noindex, nofollow",
    })
  })
})
