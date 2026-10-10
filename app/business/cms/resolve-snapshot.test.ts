import { describe, expect, it } from "vitest"
import { headers, image, page, sections, seo } from "~/test/page-documents"
import { siteSettingsDocument } from "~/test/site-settings-documents"
// The browser imports the transform straight from this shared, non-.server
// module, because live draft data arrives raw in the browser and is transformed
// there. These tests pin that entry point.
import { resolvePagesSnapshot, resolveSiteSettings } from "./resolve-snapshot"

const config = { projectId: "8ojkallk", dataset: "development" }
const CDN = "https://cdn.sanity.io/images/8ojkallk/development"

describe("resolvePagesSnapshot, imported on the browser side", () => {
  it("builds image URLs from raw published documents", () => {
    const team = page({
      _id: "page-sobre-equipe",
      address: "/sobre/equipe",
      header: [headers.pageHero],
      sections: [sections.imageSection],
    })

    const snapshot = resolvePagesSnapshot([team], config)
    const section = snapshot.get("/sobre/equipe")?.sections[0]

    expect(section?._type === "imageSection" && section.image).toEqual({
      url: `${CDN}/abc-800x600.jpg?w=800&fit=max&auto=format`,
      alt: image.alt,
      width: 800,
      height: 600,
    })
  })

  it("renders an incomplete draft Section as a placeholder, keeping the valid ones", () => {
    const draft = page({
      sections: [sections.feedback, { _type: "about", _key: "broken" }],
    })

    const snapshot = resolvePagesSnapshot([draft], config, "draft")
    const resolved = snapshot.get("/sobre")

    expect(resolved?.sections.map((s) => s._type)).toEqual([
      "feedback",
      "placeholder",
    ])
    const placeholder = resolved?.sections[1]
    expect(placeholder?._type === "placeholder" && placeholder._key).toBe(
      "broken",
    )
  })

  it("drops a draft Page whose address is unusable", () => {
    const snapshot = resolvePagesSnapshot(
      [page({ address: null })],
      config,
      "draft",
    )

    expect(snapshot.size).toBe(0)
  })

  it("builds the sharing image from a raw draft SEO image", () => {
    const draft = page({ seo: { ...seo, image } })

    const snapshot = resolvePagesSnapshot([draft], config, "draft")

    expect(snapshot.get("/sobre")?.seo.image).toMatchObject({
      width: 1200,
      height: 630,
    })
  })
})

describe("resolveSiteSettings, imported on the browser side", () => {
  it("parses a raw Site Settings document", () => {
    const result = resolveSiteSettings(siteSettingsDocument())

    expect(result?.navigation).toBeDefined()
  })

  it("treats a missing document as no Site Settings", () => {
    expect(resolveSiteSettings(null)).toBeNull()
  })

  it("throws when the document breaks the contract", () => {
    expect(() => resolveSiteSettings({ navigation: "not-an-array" })).toThrow()
  })
})
