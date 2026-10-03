import { describe, expect, it } from "vitest"
import {
  headers,
  image,
  page,
  paragraph,
  sections,
  seo,
} from "~/test/page-documents"
import { pageDocumentSchema } from "./page.schema"

const accepts = (value: unknown) =>
  expect(pageDocumentSchema.safeParse(value).success).toBe(true)

const rejects = (value: unknown) =>
  expect(pageDocumentSchema.safeParse(value).success).toBe(false)

describe("pageDocumentSchema", () => {
  describe("Page Header", () => {
    it.each(Object.entries(headers))("accepts the %s form", (_, header) => {
      accepts(page({ header: [header] }))
    })

    it("accepts a Title without an introduction", () => {
      accepts(page({ header: [{ ...headers.pageTitle, intro: null }] }))
    })

    it.each([
      ["no header", []],
      ["two headers", [headers.pageTitle, headers.pageHero]],
      ["an unknown form", [{ ...headers.pageTitle, _type: "hero" }]],
      [
        "a Hero with list text in its subtitle",
        [
          {
            ...headers.pageHero,
            subtitle: [{ ...paragraph("item")[0], listItem: "bullet" }],
          },
        ],
      ],
      ["a Hero without a subtitle", [{ ...headers.pageHero, subtitle: null }]],
      ["a Title without a title", [{ ...headers.pageTitle, title: null }]],
    ])("rejects %s", (_, header) => {
      rejects(page({ header }))
    })
  })

  describe("Sections", () => {
    it.each(Object.entries(sections))(
      "accepts the %s Section",
      (_, section) => {
        accepts(page({ sections: [section] }))
      },
    )

    it("accepts every Section type on one Page, in any order", () => {
      accepts(page({ sections: Object.values(sections).reverse() }))
    })

    it("accepts a Rich Text Section without a title", () => {
      accepts(
        page({ sections: [{ ...sections.richTextSection, title: null }] }),
      )
    })

    it("accepts a cropped Image Section", () => {
      accepts(
        page({
          sections: [
            {
              ...sections.imageSection,
              image: {
                ...sections.imageSection.image,
                crop: { top: 0.1, bottom: 0.1, left: 0.25, right: 0.25 },
              },
            },
          ],
        }),
      )
    })

    it("accepts an Image Section without a caption", () => {
      accepts(page({ sections: [{ ...sections.imageSection, caption: null }] }))
    })

    it.each([
      ["no Sections", []],
      ["an unknown Section type", [{ ...sections.feedback, _type: "video" }]],
      ["two Next Events", [sections.nextEvents, sections.nextEvents]],
      [
        "Next Events counting a fraction",
        [{ ...sections.nextEvents, count: 2.5 }],
      ],
      [
        "an About with two cards",
        [{ ...sections.about, cards: sections.about.cards.slice(1) }],
      ],
      [
        "Testimonials without quotes",
        [{ ...sections.testimonials, quotes: [] }],
      ],
      [
        "Founders whose Person lacks a photo",
        [
          {
            ...sections.founders,
            people: [{ ...sections.founders.people[0], photo: null }],
          },
        ],
      ],
      [
        "a Rich Text Section with an h1",
        [
          {
            ...sections.richTextSection,
            body: [{ ...paragraph("Título")[0], style: "h1" }],
          },
        ],
      ],
      [
        "a Rich Text Section without a body",
        [{ ...sections.richTextSection, body: null }],
      ],
      [
        "an Image Section whose image has no alt",
        [
          {
            ...sections.imageSection,
            image: { ...sections.imageSection.image, alt: null },
          },
        ],
      ],
      [
        "an Image Section whose crop leaves no width",
        [
          {
            ...sections.imageSection,
            image: {
              ...sections.imageSection.image,
              crop: { top: 0, bottom: 0, left: 0.5, right: 0.5 },
            },
          },
        ],
      ],
      [
        "an Image Section whose crop leaves no height",
        [
          {
            ...sections.imageSection,
            image: {
              ...sections.imageSection.image,
              crop: { top: 0.6, bottom: 0.4, left: 0, right: 0 },
            },
          },
        ],
      ],
      [
        "an Image Section without an image",
        [{ ...sections.imageSection, image: null }],
      ],
    ])("rejects %s", (_, pageSections) => {
      rejects(page({ sections: pageSections }))
    })
  })

  describe("address", () => {
    it.each(["/", "/sobre", "/sobre/equipe", "/codigo-de-conduta-2"])(
      "accepts %s",
      (address) => {
        accepts(page({ address }))
      },
    )

    it.each([
      "",
      "sobre",
      "/Sobre",
      "/sobre/",
      "//sobre",
      "/sobre equipe",
      "/admin",
      "/assets/app.js",
      "/codigo-de-conduta",
    ])("rejects %j", (address) => {
      rejects(page({ address }))
    })
  })

  describe("SEO", () => {
    it("accepts a full SEO object", () => {
      accepts(
        page({
          seo: { ...seo, title: "Sobre nós", image, noIndex: true },
        }),
      )
    })

    it("rejects a Page without an SEO description", () => {
      rejects(page({ seo: { ...seo, description: null } }))
    })

    it("rejects a sharing image without alt", () => {
      rejects(page({ seo: { ...seo, image: { ...image, alt: null } } }))
    })
  })
})
