import { beforeEach, describe, expect, it, vi } from "vitest"
import * as authServer from "~/business/auth/auth.server"
import { pickOption } from "~/business/payment/payment-checkout.server"
import {
  isCardPaymentsEnabled,
  isOnlinePaymentsEnabled,
} from "~/business/settings/app-settings.server"
import type { Route } from "./+types/payment-token-page"
import { action, headers, loader, meta } from "./payment-token-page"
import {
  findPaymentByToken,
  loadPaymentPageByToken,
} from "./payment-page.server"

vi.mock("~/business/auth/auth.server", () => ({
  getContext: vi.fn(),
  getUserContext: vi.fn(),
}))

vi.mock("~/business/settings/app-settings.server", () => ({
  isCardPaymentsEnabled: vi.fn(),
  isOnlinePaymentsEnabled: vi.fn(),
}))

vi.mock("~/business/payment/payment-checkout.server", () => ({
  pickOption: vi.fn(),
}))

vi.mock("./payment-page.server", () => ({
  findPaymentByToken: vi.fn(),
  loadPaymentPageByToken: vi.fn(async () => ({
    state: "closed",
    eventTitle: "",
  })),
}))

const token = "a".repeat(48)
const url = `http://localhost/pagamento/t/${token}`

const load = () =>
  loader({
    request: new Request(url),
    params: { token },
    context: {},
  } as unknown as Route.LoaderArgs)

const submit = (optionId: string) =>
  action({
    request: new Request(url, {
      method: "POST",
      body: new URLSearchParams({ optionId }),
    }),
    params: { token },
    context: {},
  } as unknown as Route.ActionArgs) as Promise<Response>

const owner = {
  paymentId: "3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c",
  profileId: "profile-owner",
  eventStarted: false,
}

describe("payment token page", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("loads the page from the token alone, never from the session", async () => {
    vi.mocked(isOnlinePaymentsEnabled).mockResolvedValue(true)
    vi.mocked(isCardPaymentsEnabled).mockResolvedValue(false)

    await load()

    expect(loadPaymentPageByToken).toHaveBeenCalledWith({
      token,
      onlinePaymentsEnabled: true,
      cardPaymentsEnabled: false,
    })
    expect(authServer.getUserContext).not.toHaveBeenCalled()
    expect(authServer.getContext).not.toHaveBeenCalled()
  })

  it("pays on behalf of the payment's owner, whoever holds the link", async () => {
    vi.mocked(findPaymentByToken).mockResolvedValue(owner)
    vi.mocked(pickOption).mockResolvedValue({
      success: true,
      data: { invoiceUrl: "https://asaas.test/i/abc" },
      errors: [],
    })

    const response = await submit("pix")

    expect(pickOption).toHaveBeenCalledWith({
      paymentId: owner.paymentId,
      profileId: owner.profileId,
      optionId: "pix",
    })
    expect(response.headers.get("Location")).toBe("https://asaas.test/i/abc")
    expect(authServer.getUserContext).not.toHaveBeenCalled()
  })

  it("refuses to pay once the event has started, back on the token page", async () => {
    vi.mocked(findPaymentByToken).mockResolvedValue({
      ...owner,
      eventStarted: true,
    })

    const response = await submit("pix")

    expect(pickOption).not.toHaveBeenCalled()
    expect(response.headers.get("Location")).toBe(`/pagamento/t/${token}`)
  })

  it("sends a failed checkout back to the token page, not to login", async () => {
    vi.mocked(findPaymentByToken).mockResolvedValue(owner)
    vi.mocked(pickOption).mockResolvedValue({
      success: false,
      errors: [new Error("Cobrança encerrada")],
    } as unknown as Awaited<ReturnType<typeof pickOption>>)

    const response = await submit("pix")

    expect(response.headers.get("Location")).toBe(`/pagamento/t/${token}`)
  })

  // The token is the whole authorization: it must not travel to another site
  // in a Referer, sit in a shared cache, or land in a search index.
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
