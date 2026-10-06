import { describe, expect, it } from "vitest"
import fixture from "../../../e2e/fixtures/pages-snapshot.json"
import { headers, image, page, sections, seo } from "~/test/page-documents"
import { pageSchema } from "./page.schema"
import { findPage, resolvePagesSnapshot } from "./pages-snapshot.server"

let documents: unknown

const config = { projectId: "8ojkallk", dataset: "development" }

const CDN = "https://cdn.sanity.io/images/8ojkallk/development"

const home = page({
  _id: "page-home",
  title: "Início",
  address: "/",
  header: [headers.homepageHero],
})
const about = page()
const team = page({
  _id: "page-sobre-equipe",
  title: "Equipe",
  address: "/sobre/equipe",
  header: [headers.pageHero],
  sections: [sections.founders, sections.imageSection],
})

function respondWith(body: unknown) {
  documents = body
}

async function resolveSnapshot() {
  return resolvePagesSnapshot(documents, config)
}

function imageSectionWith(
  dimensions: { width: number; height: number },
  crop: Record<string, number> | null = null,
) {
  return page({
    sections: [
      {
        ...sections.imageSection,
        image: {
          ...sections.imageSection.image,
          asset: {
            _type: "reference",
            _ref: `image-abc-${dimensions.width}x${dimensions.height}-jpg`,
          },
          crop,
          dimensions,
        },
      },
    ],
  })
}

async function imageOf(document: ReturnType<typeof page>) {
  respondWith([document])
  const snapshot = await resolveSnapshot()
  const section = snapshot.get(document.address as string)?.sections[0]
  if (section?._type !== "imageSection") throw new Error("Not an image")
  return section.image
}

describe("resolvePagesSnapshot", () => {
  it("keys every published Page by its address", async () => {
    respondWith([home, about, team])

    const snapshot = await resolveSnapshot()

    expect([...snapshot.keys()]).toEqual(["/", "/sobre", "/sobre/equipe"])
    expect(snapshot.get("/sobre")?.title).toBe("Sobre")
  })

  it("keeps when each Page was last updated", async () => {
    respondWith([page({ _updatedAt: "2026-09-30T13:10:12Z" })])

    const snapshot = await resolveSnapshot()

    expect(snapshot.get("/sobre")?._updatedAt).toBe("2026-09-30T13:10:12Z")
  })

  it("fails a Page that does not say when it was last updated", async () => {
    respondWith([page({ _updatedAt: undefined })])

    await expect(resolveSnapshot()).rejects.toThrow(/page-sobre \(\/sobre\)/)
  })

  it("fails a Page whose last update is not a datetime", async () => {
    respondWith([page({ _updatedAt: "ontem" })])

    await expect(resolveSnapshot()).rejects.toThrow(/page-sobre \(\/sobre\)/)
  })

  it("accepts a dataset with no Pages", async () => {
    respondWith([])

    expect((await resolveSnapshot()).size).toBe(0)
  })

  it("opens each Page with the one item of its Page Header", async () => {
    respondWith([about, team])

    const snapshot = await resolveSnapshot()

    expect(snapshot.get("/sobre")?.header).toEqual({
      _type: "pageTitle",
      title: headers.pageTitle.title,
      intro: headers.pageTitle.intro,
    })
    expect(snapshot.get("/sobre/equipe")?.header._type).toBe("pageHero")
  })

  it("keeps the Sections in the order the Editor placed them", async () => {
    respondWith([team])

    const snapshot = await resolveSnapshot()

    expect(
      snapshot.get("/sobre/equipe")?.sections.map(({ _type }) => _type),
    ).toEqual(["founders", "imageSection"])
  })

  it("replaces every founder photo with a square CDN URL", async () => {
    respondWith([team])

    const snapshot = await resolveSnapshot()
    const founders = snapshot.get("/sobre/equipe")?.sections[0]

    expect(founders?._type === "founders" && founders.people[0].photo).toEqual({
      url: `${CDN}/abc-800x600.jpg?rect=100,0,600,600&w=320&h=320&fit=crop&auto=format`,
      alt: image.alt,
      width: 320,
      height: 320,
    })
  })

  it("serves an Image Section at its own size when it is narrow", async () => {
    expect(
      await imageOf(imageSectionWith({ width: 800, height: 600 })),
    ).toEqual({
      url: `${CDN}/abc-800x600.jpg?w=800&fit=max&auto=format`,
      alt: image.alt,
      width: 800,
      height: 600,
    })
  })

  it("caps a wide Image Section at 1600 pixels, keeping its proportions", async () => {
    expect(
      await imageOf(imageSectionWith({ width: 4000, height: 3000 })),
    ).toMatchObject({ width: 1600, height: 1200 })
  })

  it("sizes a cropped Image Section by what the crop leaves", async () => {
    const result = await imageOf(
      imageSectionWith(
        { width: 800, height: 600 },
        { top: 0, bottom: 0, left: 0.25, right: 0.25 },
      ),
    )

    expect(result).toMatchObject({ width: 400, height: 600 })
    expect(result.url).toContain("w=400")
  })

  it("builds a 1200 by 630 sharing image from the SEO image", async () => {
    respondWith([page({ seo: { ...seo, image } })])

    const snapshot = await resolveSnapshot()

    expect(snapshot.get("/sobre")?.seo.image).toEqual({
      url: `${CDN}/abc-800x600.jpg?rect=0,90,800,420&w=1200&h=630&fit=crop&auto=format`,
      alt: image.alt,
      width: 1200,
      height: 630,
    })
  })

  it("leaves the sharing image empty when the Editor set none", async () => {
    respondWith([about])

    const snapshot = await resolveSnapshot()

    expect(snapshot.get("/sobre")?.seo.image).toBeNull()
  })

  it("returns Pages that satisfy the shared Page contract", async () => {
    respondWith([home, about, team])

    const snapshot = await resolveSnapshot()

    for (const resolved of snapshot.values()) {
      expect(pageSchema.parse(resolved)).toEqual(resolved)
    }
  })

  it("fails the whole snapshot when one Page breaks the contract, naming it", async () => {
    respondWith([
      about,
      page({ _id: "page-quebrada", address: "/quebrada", sections: [] }),
    ])

    await expect(resolveSnapshot()).rejects.toThrow(
      /page-quebrada \(\/quebrada\)/,
    )
  })

  it("names every Page that breaks the contract", async () => {
    respondWith([
      page({ _id: "page-a", address: "/a", sections: [] }),
      page({ _id: "page-b", address: "/b", header: [] }),
    ])

    await expect(resolveSnapshot()).rejects.toThrow(
      /page-a \(\/a\)[\s\S]*page-b \(\/b\)/,
    )
  })

  it("fails when two Pages share an address", async () => {
    respondWith([about, page({ _id: "page-sobre-2" })])

    await expect(resolveSnapshot()).rejects.toThrow(
      /page-sobre-2 \(\/sobre\)/,
    )
  })

  it("accepts the Pages recorded from the development seed", async () => {
    respondWith(fixture)

    const snapshot = await resolveSnapshot()

    expect([...snapshot.keys()]).toEqual(["/", "/sobre", "/sobre/equipe"])
  })

  it("fails when Sanity does not answer with a list", async () => {
    respondWith(null)

    await expect(resolveSnapshot()).rejects.toThrow()
  })
})

describe("findPage", () => {
  async function snapshot() {
    respondWith([home, about, team])
    return resolveSnapshot()
  }

  it("finds a Page by its address", async () => {
    expect(findPage(await snapshot(), "/sobre/equipe")?._id).toBe(
      "page-sobre-equipe",
    )
  })

  it("finds a Page whose address is asked with a trailing slash", async () => {
    expect(findPage(await snapshot(), "/sobre/")?._id).toBe("page-sobre")
  })

  it.each(["/nao-existe", "/sobre/equipe/mais", "/Sobre", "/sobre//"])(
    "finds nothing at %s",
    async (address) => {
      expect(findPage(await snapshot(), address)).toBeUndefined()
    },
  )
})
