import type {
  ContentSourceMap,
  InitializedStegaConfig,
} from "@sanity/client/stega"
import { stegaClean, stegaEncodeSourceMap } from "@sanity/client/stega"
import { describe, expect, it } from "vitest"
import { headers, image, page, sections, seo } from "~/test/page-documents"
import { siteSettingsDocument } from "~/test/site-settings-documents"
// The browser imports the transform straight from this shared, non-.server
// module, because live draft data arrives raw in the browser and is transformed
// there. These tests pin that entry point.
import { resolvePagesSnapshot, resolveSiteSettings } from "./resolve-snapshot"
import { stegaFilter } from "./stega-filter"

const config = { projectId: "8ojkallk", dataset: "development" }
const CDN = "https://cdn.sanity.io/images/8ojkallk/development"

// Encodes a string as the live draft client would, telling stega the field's
// real source path so the filter decides exactly as it will in production.
function encodeAs(value: string, sourceJsonPath: string): string {
  const sourceMap: ContentSourceMap = {
    documents: [{ _id: "page-sobre", _type: "page" }],
    paths: [sourceJsonPath],
    mappings: {
      "$['v']": { type: "value", source: { type: "documentValue", document: 0, path: 0 } },
    },
  }
  const stegaConfig = {
    enabled: true,
    studioUrl: "https://positiv.sanity.studio",
    filter: stegaFilter,
  } as unknown as InitializedStegaConfig
  return (stegaEncodeSourceMap({ v: value }, sourceMap, stegaConfig) as { v: string }).v
}

const isClean = (value: string) => value === stegaClean(value)

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

  it("resolves a stega-encoded draft: display text keeps stega, the filtered fields stay clean", () => {
    const founders = {
      ...sections.founders,
      people: [
        {
          ...sections.founders.people[0],
          name: encodeAs("Angelo", "$['name']"),
          instagram: encodeAs("angelo", "$['instagram']"),
          photo: { ...image, alt: encodeAs(image.alt, "$['photo']['alt']") },
        },
      ],
    }
    const draft = page({
      address: encodeAs("/sobre", "$['address']"),
      header: [{ ...headers.pageHero, title: encodeAs("Olá", "$['header'][0]['title']") }],
      sections: [founders],
    })

    const resolved = resolvePagesSnapshot([draft], config, "draft").get("/sobre")
    const section = resolved?.sections[0]
    const person =
      section?._type === "founders" ? section.people[0] : undefined

    // The clean address is why routing still finds the Page.
    expect(resolved).toBeDefined()
    // Display text stays encoded, so clicking it opens the field.
    expect(resolved?.header._type === "pageHero" && isClean(resolved.header.title)).toBe(false)
    expect(person && isClean(person.name)).toBe(false)
    // The filtered fields are clean, so the link, the attribute and the alt work.
    expect(person && isClean(person.instagram)).toBe(true)
    expect(person && isClean(person.photo.alt)).toBe(true)
    expect(person?.instagram).toBe("angelo")
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
