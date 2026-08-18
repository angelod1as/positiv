import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { loader } from "./root"

vi.mock("./business/auth/auth.server", () => ({
  getContext: vi.fn(),
}))

vi.mock("remix-toast", () => ({
  getToast: vi.fn(),
  redirectWithError: vi.fn(),
  redirectWithSuccess: vi.fn(),
}))

vi.mock("./business/session.server", () => ({
  newsCookie: { parse: vi.fn(), serialize: vi.fn() },
  newsletterPreferenceCookie: { parse: vi.fn(), serialize: vi.fn() },
}))

vi.mock("./components/organisms/news-dialog/news-utils", () => ({
  NEWS_VERSION: "1",
}))

vi.mock("./business/newsletter/subscription-helpers.server", () => ({
  getSubscriptionStatus: vi.fn(),
}))

vi.mock("./business/newsletter/auto-subscribe.server", () => ({
  subscribeProfileToNewsletter: vi.fn(),
}))

vi.mock("composable-functions", () => ({
  inputFromForm: vi.fn(),
}))

describe("root loader", () => {
  let mockGetContext: ReturnType<typeof vi.fn>
  let mockGetToast: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    const { getContext } = await import("./business/auth/auth.server")
    const { getToast } = await import("remix-toast")
    const { newsCookie } = await import("./business/session.server")

    mockGetContext = vi.mocked(getContext)
    mockGetToast = vi.mocked(getToast)
    vi.mocked(newsCookie.parse).mockResolvedValue({})
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("should propagate supabaseHeaders Set-Cookie in response when auth recovery occurs", async () => {
    const supabaseHeaders = new Headers()
    supabaseHeaders.append(
      "Set-Cookie",
      "sb-access-token=; Max-Age=0; Path=/",
    )
    supabaseHeaders.append(
      "Set-Cookie",
      "sb-refresh-token=; Max-Age=0; Path=/",
    )

    mockGetContext.mockResolvedValue({
      currentProfile: null,
      currentUser: null,
      isProdInDev: false,
      supabaseHeaders,
      supabase: {},
      host: "localhost",
    })

    const toastHeaders = new Headers()
    mockGetToast.mockResolvedValue({
      toast: null,
      headers: toastHeaders,
    })

    const request = new Request("http://localhost:5173/")
    await loader({ request, params: {} } as never)

    const setCookies = toastHeaders.getSetCookie()
    expect(setCookies).toContain("sb-access-token=; Max-Age=0; Path=/")
    expect(setCookies).toContain("sb-refresh-token=; Max-Age=0; Path=/")
  })

  it("should propagate supabaseHeaders even when user is authenticated", async () => {
    const supabaseHeaders = new Headers()
    supabaseHeaders.append(
      "Set-Cookie",
      "sb-access-token=new-token; Path=/; HttpOnly",
    )

    mockGetContext.mockResolvedValue({
      currentProfile: { id: "profile-1", basic_data_filled: true, race_color: ["white"] },
      currentUser: { id: "user-1", email: "test@test.com" },
      isProdInDev: false,
      supabaseHeaders,
      supabase: {},
      host: "localhost",
    })

    const toastHeaders = new Headers()
    mockGetToast.mockResolvedValue({
      toast: null,
      headers: toastHeaders,
    })

    const { newsCookie } = await import("./business/session.server")
    vi.mocked(newsCookie.parse).mockResolvedValue({
      showNews: "false",
      newsVersion: "1",
    })

    const { newsletterPreferenceCookie } = await import(
      "./business/session.server"
    )
    vi.mocked(newsletterPreferenceCookie.parse).mockResolvedValue({
      checked: true,
      shouldShow: false,
    })

    const request = new Request("http://localhost:5173/")
    await loader({ request, params: {} } as never)

    const setCookies = toastHeaders.getSetCookie()
    expect(setCookies).toContain(
      "sb-access-token=new-token; Path=/; HttpOnly",
    )
  })
})
