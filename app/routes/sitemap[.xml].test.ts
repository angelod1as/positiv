import { beforeEach, describe, expect, it, vi } from "vitest"
import { resolvePagesSnapshot } from "~/business/cms/resolve-snapshot"
import { siteSnapshotCache } from "~/business/cms/site-snapshot-cache.server"
import { page, seo } from "~/test/page-documents"
import { loader } from "./sitemap[.xml]"

vi.mock("~/business/cms/site-snapshot-cache.server", () => ({
  siteSnapshotCache: { get: vi.fn() },
}))

const SITE = "https://www.positivparty.com"

function snapshotOf(documents: unknown[]) {
  vi.mocked(siteSnapshotCache.get).mockResolvedValue({
    pages: resolvePagesSnapshot(documents, {
      projectId: "test",
      dataset: "development",
    }),
    siteSettings: null,
  })
}

const home = page({
  _id: "page-home",
  _updatedAt: "2026-09-01T10:00:00Z",
  title: "Início",
  address: "/",
})
const about = page({ _updatedAt: "2026-09-02T11:00:00Z" })
const team = page({
  _id: "page-sobre-equipe",
  _updatedAt: "2026-09-03T12:00:00Z",
  title: "Equipe",
  address: "/sobre/equipe",
})
const hidden = page({
  _id: "page-rascunho",
  _updatedAt: "2026-09-04T13:00:00Z",
  title: "Rascunho",
  address: "/rascunho",
  seo: { ...seo, noIndex: true },
})
const codeOfConduct = page({
  _id: "page-codigo-de-conduta",
  _updatedAt: "2026-09-05T14:00:00Z",
  title: "Código de Conduta",
  address: "/codigo-de-conduta",
})

async function sitemap() {
  const response = await loader()
  return { response, body: await response.text() }
}

function entry(loc: string, lastmod?: string) {
  return lastmod
    ? `<url>\n    <loc>${SITE}${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`
    : `<url>\n    <loc>${SITE}${loc}</loc>\n  </url>`
}

describe("sitemap.xml loader", () => {
  beforeEach(() => {
    snapshotOf([home, about, team, hidden, codeOfConduct])
  })

  it("returns a Response with application/xml content type", async () => {
    const { response } = await sitemap()

    expect(response).toBeInstanceOf(Response)
    expect(response.headers.get("Content-Type")).toBe("application/xml")
  })

  it("sets a public cache-control header", async () => {
    const { response } = await sitemap()

    expect(response.headers.get("Cache-Control")).toBe("public, max-age=86400")
  })

  it("lists the Page at / with when it was last updated", async () => {
    const { body } = await sitemap()

    expect(body).toContain(entry("/", "2026-09-01T10:00:00Z"))
  })

  it("lists every Page, nested addresses included, with its lastmod", async () => {
    const { body } = await sitemap()

    expect(body).toContain(entry("/sobre", "2026-09-02T11:00:00Z"))
    expect(body).toContain(entry("/sobre/equipe", "2026-09-03T12:00:00Z"))
  })

  it("lists the code of conduct, now a Page, with its lastmod", async () => {
    const { body } = await sitemap()

    expect(body).toContain(entry("/codigo-de-conduta", "2026-09-05T14:00:00Z"))
  })

  it("leaves out the Pages the Editor kept from search engines", async () => {
    const { body } = await sitemap()

    expect(body).not.toContain(`${SITE}/rascunho`)
  })

  it("keeps the public Platform URLs, which have no lastmod", async () => {
    const { body } = await sitemap()

    expect(body).toContain(entry("/feedback"))
  })

  it("lists the Pages by address, then the Platform URLs", async () => {
    snapshotOf([team, about, home, codeOfConduct])

    const { body } = await sitemap()
    const locs = [...body.matchAll(/<loc>(.*)<\/loc>/g)].map(([, loc]) => loc)

    expect(locs).toEqual([
      `${SITE}/`,
      `${SITE}/codigo-de-conduta`,
      `${SITE}/sobre`,
      `${SITE}/sobre/equipe`,
      `${SITE}/feedback`,
    ])
  })

  it("gives no priority values", async () => {
    const { body } = await sitemap()

    expect(body).not.toContain("<priority>")
  })

  it("returns a valid XML sitemap with urlset root element", async () => {
    const { body } = await sitemap()

    expect(body).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(body).toContain(
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    )
    expect(body).toContain("</urlset>")
  })

  it("answers 503, not a sitemap without its Pages, when the Pages cannot load", async () => {
    vi.mocked(siteSnapshotCache.get).mockRejectedValue(
      new Error("Sanity is down"),
    )

    const { response, body } = await sitemap()

    expect(response.status).toBe(503)
    expect(body).toBe("")
    expect(response.headers.get("Cache-Control")).toBeNull()
  })
})
