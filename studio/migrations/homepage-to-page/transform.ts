import { HOMEPAGE_PAGE_ID } from "../../schemas/documents/page"

type Item = { _type: string; _key: string; [field: string]: unknown }

export type HomepageDocument = { _id: string; [field: string]: unknown }

export type PageDocument = {
  _id: string
  _type: "page"
  title: string
  address: string
  header: Item[]
  sections: Item[]
  seo: { _type: "seo"; description: string; noIndex: boolean }
}

const sections = [
  { name: "nextEvents", key: "next-events" },
  { name: "about", key: "about" },
  { name: "testimonials", key: "testimonials" },
  { name: "ctaBanner", key: "cta-banner" },
  { name: "founders", key: "founders" },
  { name: "feedback", key: "feedback" },
]

const rootDescription =
  "Eventos para amantes de saliências não-mono, curioses com o mundo da suruba, e quem quer explorar a própria sexualidade"

function fieldOf(homepage: HomepageDocument, name: string) {
  const value = homepage[name]

  if (typeof value !== "object" || value === null) {
    throw new Error(`The homepage has no ${name}; publish it before migrating.`)
  }

  return value as Record<string, unknown>
}

export function homepageToPage(homepage: HomepageDocument): PageDocument {
  const { title, subtitle } = fieldOf(homepage, "hero")

  return {
    _id: HOMEPAGE_PAGE_ID,
    _type: "page",
    title: "Início",
    address: "/",
    header: [{ _type: "homepageHero", _key: "header", title, subtitle }],
    sections: sections.map(({ name, key }) => ({
      ...fieldOf(homepage, name),
      _type: name,
      _key: key,
    })),
    seo: { _type: "seo", description: rootDescription, noIndex: false },
  }
}
