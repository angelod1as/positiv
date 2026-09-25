import { createSchema } from "sanity"
import { describe, expect, it } from "vitest"

import { pathsOf } from "../../test/errors"
import { paragraphs } from "../../test/portable-text"
import { validateDocumentOf } from "../../test/validate"
import { schemaTypes } from "../schema-types"

const sections = {
  hero: {
    _type: "hero",
    title: "evento de gente pelada",
    subtitle: paragraphs("não-mono"),
  },
  nextEvents: {
    _type: "nextEvents",
    title: "Próximos Eventos",
    subtitle: "Confira nossos próximos encontros.",
    count: 3,
  },
  about: {
    _type: "about",
    title: "Como assim?",
    cards: ["a", "b", "c"].map((key) => ({
      _type: "aboutCard",
      _key: key,
      title: "para quem?",
      body: paragraphs("Para pessoas queer."),
    })),
  },
  testimonials: {
    _type: "testimonials",
    title: "Quem vai, nunca esquece",
    subtitle: "Experiências reais.",
    quotes: [
      {
        _type: "testimonial",
        _key: "q",
        author: "A., 32",
        quote: "Libertador.",
      },
    ],
  },
  ctaBanner: {
    _type: "ctaBanner",
    title: "Não perca nossos próximos eventos",
    body: paragraphs("Faça login agora."),
  },
  founders: {
    _type: "founders",
    title: "Quem faz a Positiv?",
    people: [{ _type: "reference", _key: "j", _ref: "person-julia" }],
    videoUrl: "https://www.youtube.com/watch?v=WIveBynr7Yc",
    videoTitle: "Vídeo de apresentação",
  },
  feedback: {
    _type: "feedback",
    title: "Nos deixe um feedback",
    body: paragraphs("Estamos sempre buscando melhorias."),
    ctaLabel: "Deixar feedback",
  },
}

describe("homepage", () => {
  it("accepts every section filled in", async () => {
    expect(await validateDocumentOf("homepage", sections)).toEqual([])
  })

  it.each(Object.keys(sections))("requires the %s section", async (section) => {
    const errors = await validateDocumentOf("homepage", {
      ...sections,
      [section]: undefined,
    })

    expect(pathsOf(errors)).toContain(section)
  })

  it("validates the sections it holds", async () => {
    const errors = await validateDocumentOf("homepage", {
      ...sections,
      hero: { ...sections.hero, title: undefined },
    })

    expect(pathsOf(errors)).toContain("hero.title")
  })

  it("lists the sections in the order the page shows them", () => {
    const homepage = createSchema({ name: "order", types: schemaTypes }).get(
      "homepage",
    ) as {
      fields: { name: string }[]
    }

    expect(homepage.fields.map((field) => field.name)).toEqual([
      "hero",
      "nextEvents",
      "about",
      "testimonials",
      "ctaBanner",
      "founders",
      "feedback",
    ])
  })
})
