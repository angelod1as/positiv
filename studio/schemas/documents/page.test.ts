import { SanityClient } from "@sanity/client"
import { createSchema } from "sanity"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { pathsOf } from "../../test/errors"
import { paragraphs } from "../../test/portable-text"
import { sections } from "../../test/sections"
import { validateDocumentOf } from "../../test/validate"
import { schemaTypes } from "../schema-types"

const headers = {
  homepageHero: {
    _type: "homepageHero",
    _key: "h",
    title: "evento de gente pelada",
    subtitle: paragraphs("para amantes de saliências não-mono"),
  },
  pageHero: {
    _type: "pageHero",
    _key: "h",
    title: "Quem somos",
    subtitle: paragraphs("Uma comunidade naturista queer."),
  },
  pageTitle: { _type: "pageTitle", _key: "h", title: "Sobre" },
}

const page = {
  title: "Sobre",
  address: "/sobre",
  header: [headers.pageTitle],
  sections: [sections.about],
  seo: {
    _type: "seo",
    description:
      "Quem somos, como nascemos e por que fazemos eventos naturistas para pessoas queer.",
  },
}

const homepage = {
  ...page,
  _id: "drafts.page-home",
  title: "Início",
  address: "/",
  header: [headers.homepageHero],
  sections: Object.values(sections),
}

type CountQuery = { fetch(query: string, params: object): Promise<number> }

function pagesAtAddress(count: number) {
  return vi
    .spyOn(SanityClient.prototype as unknown as CountQuery, "fetch")
    .mockResolvedValue(count)
}

async function addressErrors(address: unknown) {
  const _id = address === "/" ? "page-home" : "page-sobre"

  return (await validateDocumentOf("page", { ...page, _id, address })).filter(
    (error) => error.path === "address",
  )
}

describe("page", () => {
  beforeEach(() => {
    pagesAtAddress(0)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("accepts a complete page", async () => {
    expect(await validateDocumentOf("page", page)).toEqual([])
  })

  it("accepts a complete Homepage", async () => {
    expect(await validateDocumentOf("page", homepage)).toEqual([])
  })

  it.each(["title", "address", "header", "sections", "seo"])(
    "requires the %s",
    async (field) => {
      const errors = await validateDocumentOf("page", {
        ...page,
        [field]: undefined,
      })

      expect(pathsOf(errors)).toContain(field)
    },
  )

  describe("address", () => {
    it.each(["/", "/sobre", "/sobre/equipe", "/2026-verao", "/a/b/c"])(
      "accepts %s",
      async (address) => {
        expect(await addressErrors(address)).toEqual([])
      },
    )

    it.each([
      ["no leading slash", "sobre"],
      ["a trailing slash", "/sobre/"],
      ["an empty segment", "/sobre//equipe"],
      ["uppercase letters", "/Sobre"],
      ["accents", "/sobre/programação"],
      ["spaces", "/sobre nos"],
      ["underscores", "/sobre_nos"],
      ["a dot", "/sobre.html"],
      ["a query string", "/sobre?a=1"],
      ["a fragment", "/sobre#equipe"],
      ["a protocol-relative address", "//sobre"],
      ["a full URL", "https://positiv.com.br/sobre"],
    ])("rejects %s", async (_, address) => {
      expect(await addressErrors(address)).not.toEqual([])
    })

    it.each(["/admin", "/entrar", "/api/feedback", "/assets/logo", "/dev"])(
      "rejects %s, whose first segment belongs to the Platform",
      async (address) => {
        expect(await addressErrors(address)).not.toEqual([])
      },
    )

    it("keeps the Homepage's fixed id at /, so it cannot be moved and then deleted", async () => {
      const errors = await validateDocumentOf("page", {
        ...page,
        _id: "drafts.page-home",
        address: "/inicio",
      })

      expect(pathsOf(errors)).toContain("address")
    })

    it("gives / only to the Homepage's fixed id", async () => {
      const errors = await validateDocumentOf("page", {
        ...homepage,
        _id: "drafts.3f2a9c",
      })

      expect(pathsOf(errors)).toContain("address")
    })

    it("allows a reserved word below the first segment", async () => {
      expect(await addressErrors("/sobre/admin")).toEqual([])
    })

    it("rejects an address another page already has", async () => {
      pagesAtAddress(1)

      expect(await addressErrors("/sobre")).not.toEqual([])
    })

    it("stops a second page from claiming /", async () => {
      pagesAtAddress(1)

      expect(await addressErrors("/")).not.toEqual([])
    })

    it("looks for other pages at the same address, not at this page's own versions", async () => {
      const fetch = pagesAtAddress(0)

      await validateDocumentOf("page", { ...page, _id: "drafts.page-sobre" })

      expect(fetch).toHaveBeenCalledWith(expect.any(String), {
        address: "/sobre",
        id: "page-sobre",
      })
    })
  })

  describe("Page Header", () => {
    it.each(["pageHero", "pageTitle"] as const)(
      "accepts a %s on a page other than /",
      async (form) => {
        expect(
          await validateDocumentOf("page", {
            ...page,
            header: [headers[form]],
          }),
        ).toEqual([])
      },
    )

    it("takes exactly one header", async () => {
      const errors = await validateDocumentOf("page", {
        ...page,
        header: [headers.pageTitle, { ...headers.pageHero, _key: "h2" }],
      })

      expect(pathsOf(errors)).toContain("header")
    })

    it("keeps the Homepage Hero off pages other than /", async () => {
      const errors = await validateDocumentOf("page", {
        ...page,
        header: [headers.homepageHero],
      })

      expect(pathsOf(errors)).toContain("header")
    })

    it.each(["pageHero", "pageTitle"] as const)(
      "opens / with the Homepage Hero, not a %s",
      async (form) => {
        const errors = await validateDocumentOf("page", {
          ...homepage,
          header: [headers[form]],
        })

        expect(pathsOf(errors)).toContain("header")
      },
    )

    it("validates the header it holds", async () => {
      const errors = await validateDocumentOf("page", {
        ...page,
        header: [{ ...headers.pageTitle, title: undefined }],
      })

      expect(pathsOf(errors)).toContain("header.h.title")
    })
  })

  describe("sections", () => {
    it("offers every Section type except the old hero", () => {
      const pageType = createSchema({ name: "page", types: schemaTypes }).get(
        "page",
      ) as { fields: { name: string; type: { of: { name: string }[] } }[] }

      const sectionsField = pageType.fields.find(
        (field) => field.name === "sections",
      )

      expect(sectionsField?.type.of.map((type) => type.name)).toEqual([
        "nextEvents",
        "about",
        "testimonials",
        "ctaBanner",
        "founders",
        "feedback",
        "richTextSection",
      ])
    })

    it("requires at least one section", async () => {
      const errors = await validateDocumentOf("page", {
        ...page,
        sections: [],
      })

      expect(pathsOf(errors)).toContain("sections")
    })

    it("lets a section repeat, in any order", async () => {
      expect(
        await validateDocumentOf("page", {
          ...page,
          sections: [
            sections.feedback,
            sections.about,
            { ...sections.about, _key: "about-2" },
          ],
        }),
      ).toEqual([])
    })

    it("allows at most one Next Events section", async () => {
      const errors = await validateDocumentOf("page", {
        ...page,
        sections: [
          sections.nextEvents,
          sections.about,
          { ...sections.nextEvents, _key: "next-events-2" },
        ],
      })

      expect(pathsOf(errors)).toContain("sections")
    })

    it("validates the sections it holds", async () => {
      const errors = await validateDocumentOf("page", {
        ...page,
        sections: [{ ...sections.about, title: undefined }],
      })

      expect(pathsOf(errors)).toContain("sections.about.title")
    })
  })

  it("validates its SEO", async () => {
    const errors = await validateDocumentOf("page", {
      ...page,
      seo: { _type: "seo" },
    })

    expect(pathsOf(errors)).toContain("seo.description")
  })
})
