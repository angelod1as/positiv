import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { siteSettingsSchema } from "./business/cms/site-settings.schema"
import { siteSettingsDocument } from "./test/site-settings-documents"
import { loader } from "./root"

vi.mock("./business/cms/site-snapshot-cache.server", () => ({
  siteSnapshotCache: { get: vi.fn() },
}))

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

const isDraftModeEnabled = vi.hoisted(() => vi.fn())
const loadDraftSnapshotQuery = vi.hoisted(() => vi.fn())

vi.mock("./business/cms/draft-mode.server", () => ({ isDraftModeEnabled }))
vi.mock("./business/cms/live-loader.server", () => ({ loadDraftSnapshotQuery }))

describe("root loader", () => {
  let mockGetContext: ReturnType<typeof vi.fn>
  let mockGetToast: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    const { getContext } = await import("./business/auth/auth.server")
    const { getToast } = await import("remix-toast")
    const { newsCookie } = await import("./business/session.server")

    const { siteSnapshotCache } = await import(
      "./business/cms/site-snapshot-cache.server"
    )

    mockGetContext = vi.mocked(getContext)
    mockGetToast = vi.mocked(getToast)
    vi.mocked(newsCookie.parse).mockResolvedValue({})
    vi.mocked(siteSnapshotCache.get).mockResolvedValue({
      pages: new Map(),
      siteSettings: null,
    })
    isDraftModeEnabled.mockResolvedValue(false)
    loadDraftSnapshotQuery.mockResolvedValue({
      initial: { data: { pages: [], siteSettings: null } },
      query: "the-snapshot-query",
      params: {},
      clientConfig: {
        projectId: "8ojkallk",
        dataset: "development",
        apiVersion: "2026-09-24",
      },
    })
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

  describe("draft mode", () => {
    it("flags draft mode, carries the live snapshot and bypasses the published cache", async () => {
      isDraftModeEnabled.mockResolvedValue(true)
      loadDraftSnapshotQuery.mockResolvedValue({
        initial: {
          data: { pages: [], siteSettings: siteSettingsDocument() },
        },
        query: "the-snapshot-query",
        params: {},
        clientConfig: {
          projectId: "8ojkallk",
          dataset: "development",
          apiVersion: "2026-09-24",
        },
      })
      mockGetContext.mockResolvedValue({
        currentProfile: null,
        currentUser: null,
        isProdInDev: false,
        supabaseHeaders: new Headers(),
        supabase: {},
        host: "localhost",
      })
      mockGetToast.mockResolvedValue({ toast: null, headers: new Headers() })

      const { siteSnapshotCache } = await import(
        "./business/cms/site-snapshot-cache.server"
      )

      const request = new Request("http://localhost:5173/")
      const result = (await loader({ request, params: {} } as never)) as {
        data: {
          draftMode: boolean
          liveSnapshot: { query: string }
          siteSettings: unknown
        }
      }

      expect(result.data.draftMode).toBe(true)
      expect(result.data.liveSnapshot.query).toBe("the-snapshot-query")
      expect(result.data.siteSettings).toEqual(
        siteSettingsSchema.parse(siteSettingsDocument()),
      )
      expect(loadDraftSnapshotQuery).toHaveBeenCalled()
      expect(siteSnapshotCache.get).not.toHaveBeenCalled()
    })

    it("leaves draft mode off for an ordinary visitor", async () => {
      mockGetContext.mockResolvedValue({
        currentProfile: null,
        currentUser: null,
        isProdInDev: false,
        supabaseHeaders: new Headers(),
        supabase: {},
        host: "localhost",
      })
      mockGetToast.mockResolvedValue({ toast: null, headers: new Headers() })

      const request = new Request("http://localhost:5173/")
      const result = (await loader({ request, params: {} } as never)) as {
        data: { draftMode: boolean; liveSnapshot: unknown }
      }

      expect(result.data.draftMode).toBe(false)
      expect(result.data.liveSnapshot).toBeUndefined()
      expect(loadDraftSnapshotQuery).not.toHaveBeenCalled()
    })
  })

  describe("needsProfileUpdate", () => {
    const loadWithProfile = async (
      profile: Record<string, unknown> | null,
    ) => {
      mockGetContext.mockResolvedValue({
        currentProfile: profile,
        currentUser: profile ? { id: "user-1", email: "test@test.com" } : null,
        isProdInDev: false,
        supabaseHeaders: new Headers(),
        supabase: {},
        host: "localhost",
      })
      mockGetToast.mockResolvedValue({ toast: null, headers: new Headers() })

      const { newsCookie, newsletterPreferenceCookie } = await import(
        "./business/session.server"
      )
      vi.mocked(newsCookie.parse).mockResolvedValue({
        showNews: "false",
        newsVersion: "1",
      })
      vi.mocked(newsletterPreferenceCookie.parse).mockResolvedValue({
        checked: true,
        shouldShow: false,
      })

      const request = new Request("http://localhost:5173/")
      const result = (await loader({ request, params: {} } as never)) as {
        data: { needsProfileUpdate: boolean }
      }

      return result.data.needsProfileUpdate
    }

    const complete = {
      id: "profile-1",
      basic_data_filled: true,
      race_color: ["Branca"],
      cpf: "111.444.777-35",
      phone: 11999998888,
      phone_is_international: false,
    }

    it("leaves a profile alone when race and CPF are both good", async () => {
      expect(await loadWithProfile(complete)).toBe(false)
    })

    it("asks for an update when the CPF fails the check digits", async () => {
      expect(await loadWithProfile({ ...complete, cpf: "11144477736" })).toBe(
        true,
      )
    })

    it("asks for an update when there is no CPF at all", async () => {
      expect(await loadWithProfile({ ...complete, cpf: null })).toBe(true)
      expect(await loadWithProfile({ ...complete, cpf: "" })).toBe(true)
    })

    it("still asks for an update when race or colour is missing", async () => {
      expect(await loadWithProfile({ ...complete, race_color: [] })).toBe(true)
    })

    it("asks for an update when there is no phone at all", async () => {
      expect(await loadWithProfile({ ...complete, phone: null })).toBe(true)
    })

    it("asks for an update when the phone is not a Brazilian mobile", async () => {
      expect(await loadWithProfile({ ...complete, phone: 1133334444 })).toBe(
        true,
      )
      expect(await loadWithProfile({ ...complete, phone: 1199998888 })).toBe(
        true,
      )
      expect(
        await loadWithProfile({ ...complete, phone: 351912345678 }),
      ).toBe(true)
    })

    it("leaves alone a foreign phone flagged international", async () => {
      expect(
        await loadWithProfile({
          ...complete,
          phone: 351912345678,
          phone_is_international: true,
        }),
      ).toBe(false)
    })

    it("asks nothing of a visitor with no profile", async () => {
      expect(await loadWithProfile(null)).toBe(false)
    })
  })

  describe("Site Settings", () => {
    const siteSettings = siteSettingsSchema.parse(siteSettingsDocument())
    const profile = { id: "profile-1", race_color: ["Branca"] }

    async function load() {
      mockGetContext.mockResolvedValue({
        currentProfile: profile,
        currentUser: { id: "user-1", email: "test@test.com" },
        isProdInDev: false,
        supabaseHeaders: new Headers(),
        supabase: {},
        host: "localhost",
      })
      mockGetToast.mockResolvedValue({ toast: null, headers: new Headers() })
      const { newsletterPreferenceCookie } = await import(
        "./business/session.server"
      )
      vi.mocked(newsletterPreferenceCookie.parse).mockResolvedValue({
        checked: true,
        shouldShow: false,
      })

      const request = new Request("http://localhost:5173/dashboard")
      const result = (await loader({ request, params: {} } as never)) as {
        data: {
          siteSettings: unknown
          editorialSystemUnavailable: unknown
          currentProfile: unknown
        }
      }
      return result.data
    }

    it("hands every page the Site Settings", async () => {
      const { siteSnapshotCache } = await import(
        "./business/cms/site-snapshot-cache.server"
      )
      vi.mocked(siteSnapshotCache.get).mockResolvedValue({
        pages: new Map(),
        siteSettings,
      })

      const data = await load()

      expect(data.siteSettings).toEqual(siteSettings)
      expect(data.editorialSystemUnavailable).toBe(false)
    })

    it("still loads a Platform page, with no Site Settings, when Sanity is unreachable", async () => {
      const { siteSnapshotCache } = await import(
        "./business/cms/site-snapshot-cache.server"
      )
      vi.mocked(siteSnapshotCache.get).mockRejectedValue(
        new Error("connect ECONNREFUSED"),
      )

      const data = await load()

      expect(data.siteSettings).toBeNull()
      expect(data.editorialSystemUnavailable).toBe(true)
      expect(data.currentProfile).toEqual(profile)
    })

    it("still hands out the Site Settings when the session cannot be read", async () => {
      const { siteSnapshotCache } = await import(
        "./business/cms/site-snapshot-cache.server"
      )
      vi.mocked(siteSnapshotCache.get).mockResolvedValue({
        pages: new Map(),
        siteSettings,
      })
      mockGetContext.mockRejectedValue(new Error("Supabase is down"))
      const request = new Request("http://localhost:5173/")

      const result = (await loader({ request, params: {} } as never)) as {
        siteSettings: unknown
        editorialSystemUnavailable: unknown
      }

      expect(result.siteSettings).toEqual(siteSettings)
      expect(result.editorialSystemUnavailable).toBe(false)
    })
  })
})
