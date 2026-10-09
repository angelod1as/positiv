import { beforeEach, describe, expect, it, vi } from "vitest"
import pagesFixture from "../../../e2e/fixtures/pages-snapshot.json"
import siteSettingsFixture from "../../../e2e/fixtures/site-settings.json"
import { page } from "~/test/page-documents"
import { siteSettingsDocument } from "~/test/site-settings-documents"
import { siteSnapshotQuery } from "./site-snapshot-query"
import { getSiteSnapshot } from "./site-snapshot.server"

const fetchMock = vi.fn<(query: string) => Promise<unknown>>()

const client = {
  fetch: fetchMock,
  config: () => ({ projectId: "8ojkallk", dataset: "development" }),
}

function respondWith(body: unknown) {
  fetchMock.mockResolvedValueOnce(body)
}

beforeEach(() => {
  fetchMock.mockReset()
})

describe("getSiteSnapshot", () => {
  it("fetches the Pages and the Site Settings in one query", async () => {
    respondWith({ pages: [], siteSettings: null })

    await getSiteSnapshot(client)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(siteSnapshotQuery)
  })

  it("keys the Pages by their address", async () => {
    respondWith({ pages: [page()], siteSettings: siteSettingsDocument() })

    const { pages } = await getSiteSnapshot(client)

    expect([...pages.keys()]).toEqual(["/sobre"])
  })

  it("resolves the Site Settings", async () => {
    respondWith({ pages: [], siteSettings: siteSettingsDocument() })

    const { siteSettings } = await getSiteSnapshot(client)

    expect(siteSettings?.navigation.map(({ href }) => href)).toEqual([
      "/sobre",
      "/eventos",
    ])
  })

  it("has no Site Settings when the document is missing", async () => {
    respondWith({ pages: [page()], siteSettings: null })

    const { pages, siteSettings } = await getSiteSnapshot(client)

    expect(siteSettings).toBeNull()
    expect(pages.size).toBe(1)
  })

  it("fails the whole snapshot when the Site Settings break the contract", async () => {
    respondWith({
      pages: [page()],
      siteSettings: siteSettingsDocument({ footer: null }),
    })

    await expect(getSiteSnapshot(client)).rejects.toThrow(/Site Settings/)
  })

  it("fails the whole snapshot when a Page breaks the contract", async () => {
    respondWith({
      pages: [page({ sections: [] })],
      siteSettings: siteSettingsDocument(),
    })

    await expect(getSiteSnapshot(client)).rejects.toThrow(/page-sobre/)
  })

  it("validates each Section on its own in draft mode", async () => {
    respondWith({
      pages: [page({ sections: [{ _type: "about", _key: "broken" }] })],
      siteSettings: null,
    })

    const { pages } = await getSiteSnapshot(client, "draft")

    expect(pages.get("/sobre")?.sections.map(({ _type }) => _type)).toEqual([
      "placeholder",
    ])
  })

  it("accepts the snapshot recorded from the development seed", async () => {
    respondWith({ pages: pagesFixture, siteSettings: siteSettingsFixture })

    const { siteSettings } = await getSiteSnapshot(client)

    expect(
      siteSettings?.navigation.map(({ label, href }) => [label, href]),
    ).toEqual([
      ["Sobre", "/sobre"],
      ["Equipe", "/sobre/equipe"],
      ["Eventos", "/eventos"],
      ["Instagram", "https://instagram.com/positivparty"],
    ])
  })

  it("fails when Sanity does not answer with both parts", async () => {
    respondWith([])

    await expect(getSiteSnapshot(client)).rejects.toThrow()
  })
})
