import { SanityClient } from "@sanity/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { CODE_OF_CONDUCT_PAGE_ID } from "../migrations/code-of-conduct-to-page/transform"
import { HOMEPAGE_PAGE_ID } from "../schemas/documents/page"
import { SITE_SETTINGS_ID } from "../singletons"
import { validateDocumentOf } from "../test/validate"
import {
  E2E_TEST_PAGE_ADDRESS,
  E2E_TEST_PAGE_ID,
  E2E_TEST_SENTINEL,
  seed,
  seedDocuments,
} from "./seed"

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

  it("seeds a dedicated e2e test page: noIndex, every Section type, the sentinel", () => {
    const testPage = pages.find((page) => page._id === E2E_TEST_PAGE_ID)

    expect(testPage?.address).toBe(E2E_TEST_PAGE_ADDRESS)
    expect(testPage?.header?.[0]._type).toBe("pageTitle")
    expect((testPage?.seo as { noIndex?: boolean })?.noIndex).toBe(true)
    expect(testPage?.sections?.map((section) => section._type)).toEqual([
      "nextEvents",
      "about",
      "testimonials",
      "ctaBanner",
      "founders",
      "feedback",
      "richTextSection",
      "imageSection",
    ])
    expect(JSON.stringify(testPage)).toContain(E2E_TEST_SENTINEL)
  })

  it("seeds a nested Page with a Hero and a Page with a Title", () => {
    expect(pages.map((page) => [page.address, page.header?.[0]._type])).toEqual(
      expect.arrayContaining([
        ["/sobre/equipe", "pageHero"],
        ["/sobre", "pageTitle"],
      ]),
    )
  })

  it("seeds the code of conduct as a Page with a Title and a Rich Text Section", () => {
    const codeOfConduct = pages.find(
      (page) => page.address === "/codigo-de-conduta",
    )

    expect(codeOfConduct?._id).toBe(CODE_OF_CONDUCT_PAGE_ID)
    expect(codeOfConduct?.header?.[0]._type).toBe("pageTitle")
    expect(codeOfConduct?.sections?.map((section) => section._type)).toEqual([
      "richTextSection",
    ])
  })

  describe("Site Settings", () => {
    type Link = { page?: { _ref: string }; url?: string }

    const siteSettings = documents.find(
      (document) => document._id === SITE_SETTINGS_ID,
    ) as
      | {
          _type: string
          navigation?: Link[]
          footer?: {
            columns?: { links?: Link[] }[]
            social?: { network?: string }[]
            text?: unknown[]
            development?: Record<string, unknown>
          }
          notice?: unknown[]
        }
      | undefined

    it("seeds the singleton", () => {
      expect(siteSettings?._type).toBe("siteSettings")
    })

    it("links the Navigation to seeded Pages and to one external URL", () => {
      const pageIds = pages.map((page) => page._id)
      const navigation = siteSettings?.navigation ?? []
      const toPages = navigation.filter((link) => link.page)

      expect(toPages.length).toBeGreaterThan(0)
      expect(pageIds).toEqual(
        expect.arrayContaining(toPages.map((link) => link.page?._ref)),
      )
      expect(
        navigation.filter((link) => link.url?.startsWith("https://")),
      ).toHaveLength(1)
    })

    it("seeds a full footer", () => {
      const footer = siteSettings?.footer

      expect(footer?.columns?.length).toBeGreaterThan(0)
      expect(footer?.social?.map((social) => social.network)).toEqual([
        "instagram",
      ])
      expect(footer?.text?.length).toBeGreaterThan(1)
      expect(footer?.development).toBeUndefined()
    })

    it("seeds a Notice", () => {
      expect(siteSettings?.notice?.length).toBeGreaterThan(0)
    })
  })
})
