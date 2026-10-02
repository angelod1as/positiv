import { SanityClient } from "@sanity/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { HOMEPAGE_PAGE_ID } from "../schemas/documents/page"
import { validateDocumentOf } from "../test/validate"
import { seed, seedDocuments } from "./seed"

function fakeStore() {
  return {
    uploadPhoto: vi.fn(async () => "image-seed-400x400-png"),
    replace: vi.fn(async () => undefined),
  }
}

describe("seed", () => {
  it.each([
    ["production", "production"],
    ["no dataset", undefined],
    ["a dataset that only looks like development", "Development"],
    ["a dataset that only contains development", "development-old"],
  ])(
    "refuses to run against %s, before writing anything",
    async (_, dataset) => {
      const store = fakeStore()

      await expect(seed(dataset, store)).rejects.toThrow(/development/)
      expect(store.uploadPhoto).not.toHaveBeenCalled()
      expect(store.replace).not.toHaveBeenCalled()
    },
  )

  it("replaces the seed documents in development", async () => {
    const store = fakeStore()

    await seed("development", store)

    expect(store.replace).toHaveBeenCalledWith(
      seedDocuments("image-seed-400x400-png"),
    )
  })
})

describe("seedDocuments", () => {
  const documents = seedDocuments("image-seed-400x400-png")
  const pages = documents.filter((document) => document._type === "page")

  beforeEach(() => {
    vi.spyOn(
      SanityClient.prototype as unknown as {
        fetch(query: string, params: object): Promise<number>
      },
      "fetch",
    ).mockResolvedValue(0)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it.each(documents.map((document) => [document._id, document]))(
    "writes a valid %s",
    async (_, { _type, ...fields }) => {
      expect(await validateDocumentOf(_type, fields)).toEqual([])
    },
  )

  it("uses fixed ids, so running it twice changes nothing", () => {
    expect(seedDocuments("image-seed-400x400-png")).toEqual(documents)
    expect(new Set(documents.map((document) => document._id)).size).toBe(
      documents.length,
    )
  })

  it("seeds the Homepage with every Section type", () => {
    const homepage = pages.find((page) => page._id === HOMEPAGE_PAGE_ID)

    expect(homepage?.address).toBe("/")
    expect(homepage?.header?.[0]._type).toBe("homepageHero")
    expect(homepage?.sections?.map((section) => section._type)).toEqual([
      "nextEvents",
      "about",
      "testimonials",
      "ctaBanner",
      "founders",
      "feedback",
      "richTextSection",
      "imageSection",
    ])
  })

  it("seeds a nested Page with a Hero and a Page with a Title", () => {
    expect(pages.map((page) => [page.address, page.header?.[0]._type])).toEqual(
      expect.arrayContaining([
        ["/sobre/equipe", "pageHero"],
        ["/sobre", "pageTitle"],
      ]),
    )
  })
})
