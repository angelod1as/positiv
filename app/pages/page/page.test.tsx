import { beforeEach, describe, expect, it, vi } from "vitest"
import * as authServer from "~/business/auth/auth.server"
import { isDraftModeEnabled } from "~/business/cms/draft-mode.server"
import { loadDraftSnapshotQuery } from "~/business/cms/live-loader.server"
import type { Page } from "~/business/cms/page.schema"
import type { PagesSnapshot } from "~/business/cms/resolve-snapshot"
import { siteSnapshotCache } from "~/business/cms/site-snapshot-cache.server"
import { whatsAppButtonCopy } from "~/copy/layout"
import { metaCopy } from "~/copy/meta"
import { getNextEvents } from "~/pages/page/fetch/get-next-events"
import { headers as docHeaders, page as pageDocument } from "~/test/page-documents"
import { pagesSnapshotFixture } from "~/test/pages-snapshot-fixture"
import { renderWithRouter, screen } from "~/test/test-utils"
import type { Route } from "./+types/page"
import PageRoute, { loader, meta } from "./page"

vi.mock("~/business/auth/auth.server", () => ({
  getContext: vi.fn(),
}))

vi.mock("~/business/cms/draft-mode.server", () => ({
  isDraftModeEnabled: vi.fn(),
}))

vi.mock("~/business/cms/live-loader.server", () => ({
  loadDraftSnapshotQuery: vi.fn(),
}))

vi.mock("~/business/cms/site-snapshot-cache.server", () => ({
  siteSnapshotCache: { get: vi.fn() },
}))

vi.mock("~/pages/page/fetch/get-next-events", () => ({
  getNextEvents: vi.fn(),
}))

let snapshot: PagesSnapshot

function argsFor(address: string) {
  return {
    request: new Request(`http://localhost${address}`),
    params: { "*": address.replace(/^\//, "") },
    context: {},
  } as unknown as Route.LoaderArgs
}

const homepageArgs = {
  request: new Request("http://localhost/"),
  params: {},
  context: {},
} as unknown as Route.LoaderArgs

function signedInAs(userId: string | undefined) {
  vi.mocked(authServer.getContext).mockResolvedValue({
    currentUser: userId ? { id: userId } : null,
    currentProfile: userId ? { id: `profile-${userId}` } : null,
  } as unknown as Awaited<ReturnType<typeof authServer.getContext>>)
}

function withPages(...pages: Page[]) {
  vi.mocked(siteSnapshotCache.get).mockResolvedValue({
    pages: new Map(pages.map((page) => [page.address, page])),
    siteSettings: null,
  })
}

function pageAt(address: string) {
  const page = snapshot.get(address)
  if (!page) throw new Error(`No Page at ${address}`)
  return page
}

async function statusOf(promise: Promise<unknown>) {
  const thrown = await promise.then(
    () => undefined,
    (error: unknown) => error,
  )
  expect(thrown).toBeInstanceOf(Response)
  return (thrown as Response).status
}

describe("Page loader", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    snapshot = await pagesSnapshotFixture()
    vi.mocked(siteSnapshotCache.get).mockResolvedValue({
      pages: snapshot,
      siteSettings: null,
    })
    vi.mocked(getNextEvents).mockResolvedValue({
      success: true,
      data: [],
      errors: [],
    })
    signedInAs(undefined)
  })

  it("returns the Page at a nested address with the login state", async () => {
    signedInAs("user-1")

    const result = await loader(argsFor("/sobre/equipe"))

    expect(result.page).toEqual(pageAt("/sobre/equipe"))
    expect(result.isLoggedIn).toBe(true)
    expect(result.draftMode).toBe(false)
  })

  it("finds the Page when the address ends with a slash", async () => {
    const result = await loader(argsFor("/sobre/"))

    expect(result.page).toEqual(pageAt("/sobre"))
  })

  it("throws a 404 for an address no Page has", async () => {
    expect(await statusOf(loader(argsFor("/nao-existe")))).toBe(404)
  })

  it("serves the Homepage from the Page at /", async () => {
    signedInAs("user-1")

    const result = await loader(homepageArgs)

    expect(result.page).toEqual(pageAt("/"))
    expect(result.isLoggedIn).toBe(true)
    await expect(result.events).resolves.toEqual([])
  })

  it("throws a 503 when there is no Page at /", async () => {
    withPages(pageAt("/sobre"))

    expect(await statusOf(loader(homepageArgs))).toBe(503)
  })

  it("starts loading the snapshot without waiting for the session", async () => {
    type Context = Awaited<ReturnType<typeof authServer.getContext>>
    let resolveContext: (context: Context) => void = () => {}
    vi.mocked(authServer.getContext).mockReturnValue(
      new Promise<Context>((resolve) => {
        resolveContext = resolve
      }),
    )

    const result = loader(homepageArgs)

    // The session stays unresolved, so the snapshot still loads without waiting
    // for it; waitFor rides out the draft-mode cookie check.
    await vi.waitFor(() => expect(siteSnapshotCache.get).toHaveBeenCalled())
    resolveContext({
      currentUser: null,
      currentProfile: null,
    } as unknown as Context)
    await result
  })

  it.each(["/assets/entry.client-abc123.js", "/admin/nada", "/api/nada"])(
    "throws a 404 for %s without loading the snapshot",
    async (address) => {
      expect(await statusOf(loader(argsFor(address)))).toBe(404)
      expect(siteSnapshotCache.get).not.toHaveBeenCalled()
    },
  )

  it("throws a 503 when the snapshot cannot be loaded on a cold start", async () => {
    vi.mocked(siteSnapshotCache.get).mockRejectedValue(
      new Error("Sanity is down"),
    )

    expect(await statusOf(loader(argsFor("/sobre")))).toBe(503)
  })

  it("streams as many events as the Page's Next Events asks for", async () => {
    const home = pageAt("/")
    withPages({
      ...home,
      address: "/agenda",
      header: pageAt("/sobre").header,
      sections: home.sections.map((section) =>
        section._type === "nextEvents" ? { ...section, count: 5 } : section,
      ),
    })
    signedInAs("user-1")

    const result = await loader(argsFor("/agenda"))

    expect(result.events).toBeInstanceOf(Promise)
    await expect(result.events).resolves.toEqual([])
    expect(getNextEvents).toHaveBeenCalledWith("profile-user-1", 5, true)
  })

  it("does not fetch events for a Page without Next Events", async () => {
    const result = await loader(argsFor("/sobre"))

    expect(result.events).toBeUndefined()
    expect(getNextEvents).not.toHaveBeenCalled()
  })

  it("streams no events when they cannot be loaded", async () => {
    withPages({ ...pageAt("/"), address: "/agenda" })
    vi.mocked(getNextEvents).mockResolvedValue({
      success: false,
      data: null,
      errors: ["boom"],
    } as unknown as Awaited<ReturnType<typeof getNextEvents>>)

    const result = await loader(argsFor("/agenda"))

    await expect(result.events).resolves.toBeUndefined()
  })
})

describe("Page loader in draft mode", () => {
  const clientConfig = {
    projectId: "8ojkallk",
    dataset: "development",
    apiVersion: "2026-09-24",
  }

  function draftWith(...docs: unknown[]) {
    vi.mocked(loadDraftSnapshotQuery).mockResolvedValue({
      initial: { data: { pages: docs, siteSettings: null } },
      query: "the-snapshot-query",
      params: {},
      clientConfig,
    } as unknown as Awaited<ReturnType<typeof loadDraftSnapshotQuery>>)
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(isDraftModeEnabled).mockResolvedValue(true)
    vi.mocked(getNextEvents).mockResolvedValue({
      success: true,
      data: [],
      errors: [],
    })
    signedInAs(undefined)
  })

  it("hands the component the raw initial data, query, params and config", async () => {
    draftWith(pageDocument({ address: "/sobre" }))

    const result = await loader(argsFor("/sobre"))

    expect(result.draftMode).toBe(true)
    expect(result.query).toBe("the-snapshot-query")
    expect(result.params).toEqual({})
    expect(result.clientConfig).toEqual(clientConfig)
    expect(result.initial).toBeDefined()
  })

  it("resolves the Page from the raw draft documents", async () => {
    draftWith(
      pageDocument({
        _id: "page-home",
        address: "/",
        header: [docHeaders.homepageHero],
      }),
    )

    const result = await loader(homepageArgs)

    expect(result.page.address).toBe("/")
  })

  it("reads drafts without touching the published snapshot cache", async () => {
    draftWith(pageDocument({ address: "/sobre" }))

    await loader(argsFor("/sobre"))

    expect(siteSnapshotCache.get).not.toHaveBeenCalled()
  })

  it("throws a 404 for a draft address no Page has", async () => {
    draftWith(pageDocument({ address: "/sobre" }))

    expect(await statusOf(loader(argsFor("/nao-existe")))).toBe(404)
  })
})

describe("Page meta", () => {
  beforeEach(async () => {
    snapshot = await pagesSnapshotFixture()
  })

  function metaFor(page: Page | undefined) {
    return meta({
      data: page && { page, events: undefined, isLoggedIn: false },
    } as unknown as Route.MetaArgs)
  }

  function find(entries: ReturnType<typeof metaFor>, key: string) {
    return entries.find(
      (entry) =>
        ("property" in entry && entry.property === key) ||
        ("name" in entry && entry.name === key) ||
        ("rel" in entry && entry.rel === key) ||
        (key === "title" && "title" in entry),
    )
  }

  it("titles the Page after its own title when SEO has none", () => {
    const entries = metaFor(pageAt("/sobre"))

    expect(find(entries, "title")).toEqual({ title: "Sobre | Positiv Party" })
    expect(find(entries, "og:title")).toMatchObject({
      content: "Sobre | Positiv Party",
    })
  })

  it("prefers the SEO title", () => {
    const page = pageAt("/sobre")
    const entries = metaFor({
      ...page,
      seo: { ...page.seo, title: "Quem somos" },
    })

    expect(find(entries, "title")).toEqual({
      title: "Quem somos | Positiv Party",
    })
  })

  it("describes the Page with its SEO description", () => {
    const page = pageAt("/sobre/equipe")
    const entries = metaFor(page)

    expect(find(entries, "description")).toMatchObject({
      content: page.seo.description,
    })
    expect(find(entries, "og:description")).toMatchObject({
      content: page.seo.description,
    })
  })

  it("points the canonical URL and og:url at the Page's address", () => {
    const entries = metaFor(pageAt("/sobre/equipe"))

    expect(find(entries, "canonical")).toEqual({
      tagName: "link",
      rel: "canonical",
      href: "https://www.positivparty.com/sobre/equipe",
    })
    expect(find(entries, "og:url")).toMatchObject({
      content: "https://www.positivparty.com/sobre/equipe",
    })
  })

  it("shares the default image when the Page has none", () => {
    expect(find(metaFor(pageAt("/sobre")), "og:image")).toMatchObject({
      content: "https://www.positivparty.com/social.jpg",
    })
  })

  it("shares the Page's own SEO image", () => {
    const page = pageAt("/sobre")
    const image = {
      url: "https://cdn.sanity.io/images/test/development/abc.jpg",
      alt: "Um grupo de pessoas",
      width: 1200,
      height: 630,
    }
    const entries = metaFor({ ...page, seo: { ...page.seo, image } })

    expect(find(entries, "og:image")).toMatchObject({ content: image.url })
    expect(find(entries, "og:image:alt")).toMatchObject({ content: image.alt })
  })

  it("asks search engines not to index a Page marked noIndex", () => {
    const page = pageAt("/sobre")

    expect(find(metaFor(page), "robots")).toBeUndefined()
    expect(
      find(metaFor({ ...page, seo: { ...page.seo, noIndex: true } }), "robots"),
    ).toEqual({ name: "robots", content: "noindex" })
  })

  it("titles the Homepage after the site when SEO has no title", () => {
    const entries = metaFor(pageAt("/"))

    expect(find(entries, "title")).toEqual({ title: metaCopy.root.title })
    expect(find(entries, "og:title")).toMatchObject({
      content: metaCopy.root.title,
    })
    expect(find(entries, "canonical")).toMatchObject({
      href: "https://www.positivparty.com/",
    })
  })

  it("falls back to the site's own title and description without a Page", () => {
    const entries = metaFor(undefined)

    expect(find(entries, "title")).toEqual({ title: metaCopy.root.title })
    expect(find(entries, "description")).toMatchObject({
      content: metaCopy.root.description,
    })
  })
})

describe("Page route", () => {
  beforeEach(async () => {
    snapshot = await pagesSnapshotFixture()
  })

  function renderPage(page: Page) {
    const loaderData = {
      page,
      events: Promise.resolve([]),
      isLoggedIn: false,
    }
    renderWithRouter(
      <PageRoute {...({ loaderData } as unknown as Route.ComponentProps)} />,
    )
  }

  const whatsAppLink = () =>
    screen.queryByRole("link", { name: whatsAppButtonCopy.ariaLabel })

  it("offers the WhatsApp button on the Homepage", () => {
    renderPage(pageAt("/"))

    expect(whatsAppLink()).toBeInTheDocument()
  })

  it("leaves the WhatsApp button off every other Page", () => {
    renderPage(pageAt("/sobre"))

    expect(whatsAppLink()).toBeNull()
  })
})
