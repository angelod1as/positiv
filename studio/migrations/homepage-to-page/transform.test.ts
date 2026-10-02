import { SanityClient } from "@sanity/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { HOMEPAGE_PAGE_ID } from "../../schemas/documents/page"
import { paragraphs } from "../../test/portable-text"
import { sections } from "../../test/sections"
import { validateDocumentOf } from "../../test/validate"
import { HomepageDocument, homepageToPage } from "./transform"

const sectionNames = [
  "nextEvents",
  "about",
  "testimonials",
  "ctaBanner",
  "founders",
  "feedback",
] as const

function withoutKey({ _key, ...section }: { _key: string } & object) {
  return section
}

const homepage: HomepageDocument = {
  _id: "homepage",
  _type: "homepage",
  _rev: "rev",
  _createdAt: "2026-01-01T00:00:00Z",
  _updatedAt: "2026-01-01T00:00:00Z",
  hero: {
    _type: "hero",
    title: "evento de gente pelada",
    subtitle: paragraphs("para amantes de saliências não-mono"),
  },
  ...Object.fromEntries(
    sectionNames.map((name) => [name, withoutKey(sections[name])]),
  ),
}

describe("homepageToPage", () => {
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

  it("writes a Page that validates against the schema", async () => {
    const { _type, ...fields } = homepageToPage(homepage)

    expect(_type).toBe("page")
    expect(await validateDocumentOf(_type, fields)).toEqual([])
  })

  it("writes the Page at / with its fixed id", () => {
    const page = homepageToPage(homepage)

    expect(page).toMatchObject({
      _id: HOMEPAGE_PAGE_ID,
      title: "Início",
      address: "/",
    })
  })

  it("opens the Page with a Homepage Hero built from the hero", () => {
    expect(homepageToPage(homepage).header).toEqual([
      {
        _type: "homepageHero",
        _key: "header",
        title: "evento de gente pelada",
        subtitle: paragraphs("para amantes de saliências não-mono"),
      },
    ])
  })

  it("keeps today's sections in today's order, each with a new key", () => {
    const page = homepageToPage(homepage)

    expect(page.sections.map((section) => section._type)).toEqual(
      sectionNames,
    )
    expect(new Set(page.sections.map((section) => section._key)).size).toBe(
      sectionNames.length,
    )
  })

  it("keeps each section's content, Person references included", () => {
    const page = homepageToPage(homepage)

    sectionNames.forEach((name, index) => {
      expect(withoutKey(page.sections[index])).toEqual(homepage[name])
    })
    expect(page.sections[4]).toMatchObject({
      people: [{ _type: "reference", _key: "j", _ref: "person-julia" }],
    })
  })

  it("sets the SEO description from the site's root description and no SEO title", () => {
    const { seo } = homepageToPage(homepage)

    expect(seo).toEqual({
      _type: "seo",
      description:
        "Eventos para amantes de saliências não-mono, curioses com o mundo da suruba, e quem quer explorar a própria sexualidade",
      noIndex: false,
    })
  })

  it("writes the same Page every time and leaves the homepage alone", () => {
    const before = structuredClone(homepage)

    expect(homepageToPage(homepage)).toEqual(homepageToPage(homepage))
    expect(homepage).toEqual(before)
  })

  it("refuses a homepage that lacks a section", () => {
    const { founders: _, ...withoutFounders } = homepage

    expect(() => homepageToPage(withoutFounders)).toThrow(/founders/)
  })

  it("refuses a homepage without a hero", () => {
    const { hero: _, ...withoutHero } = homepage

    expect(() => homepageToPage(withoutHero)).toThrow(/hero/)
  })
})
