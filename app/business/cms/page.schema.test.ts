import { describe, expect, it } from "vitest"
import { pageDocumentSchema } from "./page.schema"

const paragraph = (text: string) => [
  {
    _type: "block",
    _key: "b1",
    style: "normal",
    markDefs: [],
    children: [{ _type: "span", _key: "s1", text, marks: [] }],
  },
]

const image = {
  alt: "Duas pessoas sorrindo",
  asset: { _ref: "image-abc-800x600-jpg", _type: "reference" },
  crop: null,
  hotspot: null,
}

const sections = {
  nextEvents: {
    _type: "nextEvents",
    _key: "next-events",
    title: "Próximos eventos",
    subtitle: "Confira nossos próximos encontros.",
    count: 3,
  },
  about: {
    _type: "about",
    _key: "about",
    title: "Como assim?",
    cards: ["para quem?", "como funciona?", "e depois?"].map(
      (title, index) => ({
        _key: `card-${index}`,
        title,
        body: paragraph("Texto do cartão."),
      }),
    ),
  },
  testimonials: {
    _type: "testimonials",
    _key: "testimonials",
    title: "Quem vai, nunca esquece",
    subtitle: "Experiências reais.",
    quotes: [{ _key: "quote", author: "A., 32", quote: "Libertador." }],
  },
  ctaBanner: {
    _type: "ctaBanner",
    _key: "cta-banner",
    title: "Não perca nossos próximos eventos",
    body: paragraph("Faça login para se inscrever."),
  },
  founders: {
    _type: "founders",
    _key: "founders",
    title: "Quem faz a Positiv",
    videoUrl: "https://www.youtube.com/watch?v=abc",
    videoTitle: "Vídeo de apresentação",
    people: [
      {
        _id: "person-1",
        name: "Angelo",
        pronouns: "ele/dele",
        instagram: "angelo",
        photo: image,
        bio: paragraph("Uma bio."),
      },
    ],
  },
  feedback: {
    _type: "feedback",
    _key: "feedback",
    title: "Feedback",
    body: paragraph("Conte para a gente."),
    ctaLabel: "Deixar feedback",
  },
  richTextSection: {
    _type: "richTextSection",
    _key: "rich-text",
    title: "Código de conduta",
    body: [
      { ...paragraph("Consentimento")[0], _key: "h", style: "h2" },
      {
        ...paragraph("Não é não.")[0],
        _key: "l",
        listItem: "bullet",
        level: 1,
      },
    ],
  },
  imageSection: {
    _type: "imageSection",
    _key: "image",
    image: { ...image, dimensions: { width: 800, height: 600 } },
    caption: "Uma legenda",
  },
}

const headers = {
  homepageHero: {
    _type: "homepageHero",
    _key: "header",
    title: "evento de gente pelada",
    subtitle: paragraph("para amantes de saliências não-mono"),
  },
  pageHero: {
    _type: "pageHero",
    _key: "header",
    title: "Quem faz a Positiv",
    subtitle: paragraph("Uma página aninhada com Destaque."),
  },
  pageTitle: {
    _type: "pageTitle",
    _key: "header",
    title: "Sobre a Positiv",
    intro: "Uma página com só um título.",
  },
}

const seo = {
  title: null,
  description:
    "Quem somos e por que fazemos eventos: conteúdo de exemplo para os testes.",
  image: null,
  noIndex: null,
}

const page = (overrides: Record<string, unknown> = {}) => ({
  _id: "page-sobre",
  title: "Sobre",
  address: "/sobre",
  header: [headers.pageTitle],
  sections: [sections.feedback],
  seo,
  ...overrides,
})

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
