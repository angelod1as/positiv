import { describe, expect, it } from "vitest"
import type { PageHeader as PageHeaderContent } from "~/business/cms/page.schema"
import { renderWithRouter, screen } from "~/test/test-utils"
import { PageHeader } from "./page-header"

const subtitle = (text: string) => [
  {
    _type: "block" as const,
    _key: "b0",
    style: "normal" as const,
    markDefs: [],
    children: [{ _type: "span" as const, _key: "s0", text, marks: [] }],
  },
]

const headers = {
  homepageHero: {
    _type: "homepageHero",
    title: "evento de gente pelada",
    subtitle: subtitle("para amantes de saliências não-mono"),
  },
  pageHero: {
    _type: "pageHero",
    title: "Quem faz a Positiv",
    subtitle: subtitle("Uma página aninhada com Destaque."),
  },
  pageTitle: {
    _type: "pageTitle",
    title: "Sobre a Positiv",
    intro: "Uma página com só um título.",
  },
} satisfies Record<string, PageHeaderContent>

describe("PageHeader", () => {
  it.each(Object.values(headers))(
    "opens the Page with its title as the only h1 ($_type)",
    (header) => {
      renderWithRouter(<PageHeader header={header} />)

      expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
      expect(
        screen.getByRole("heading", { level: 1, name: header.title }),
      ).toBeInTheDocument()
    },
  )

  it("renders a placeholder in place of an incomplete Page Header", () => {
    renderWithRouter(
      <PageHeader header={{ _type: "placeholder", missing: ["title"] }} />,
    )

    expect(
      screen.getByText("Cabeçalho incompleto: falta o título"),
    ).toBeInTheDocument()
  })

  it("renders the Homepage Hero as the homepage does", () => {
    const { container } = renderWithRouter(
      <PageHeader header={headers.homepageHero} />,
    )

    expect(container.querySelector("h1 + p")).toHaveTextContent(
      "para amantes de saliências não-mono",
    )
  })

  it("renders the Hero's subtitle", () => {
    renderWithRouter(<PageHeader header={headers.pageHero} />)

    expect(
      screen.getByText("Uma página aninhada com Destaque."),
    ).toBeInTheDocument()
  })

  it("makes the Hero a lesser heading than the Homepage Hero", () => {
    renderWithRouter(<PageHeader header={headers.homepageHero} />)
    const homepageClasses = screen.getByRole("heading", { level: 1 }).className

    renderWithRouter(<PageHeader header={headers.pageHero} />)
    const heroHeading = screen.getByRole("heading", {
      level: 1,
      name: headers.pageHero.title,
    })

    expect(heroHeading.className).not.toBe(homepageClasses)
    expect(heroHeading.className).not.toMatch(/text-8xl/)
  })

  it("renders the Title's introduction when the Editor wrote one", () => {
    renderWithRouter(<PageHeader header={headers.pageTitle} />)

    expect(screen.getByText("Uma página com só um título.")).toBeInTheDocument()
  })

  it("renders only the title when the Title has no introduction", () => {
    const { container } = renderWithRouter(
      <PageHeader header={{ ...headers.pageTitle, intro: null }} />,
    )

    expect(container.querySelector("p")).toBeNull()
  })
})
