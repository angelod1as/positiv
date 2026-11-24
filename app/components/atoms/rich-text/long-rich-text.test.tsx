import { describe, expect, it } from "vitest"
import type { LongPortableText } from "~/business/cms/content.schema"
import { renderWithRouter, screen } from "~/test/test-utils"
import { LongRichText } from "./rich-text"

type Block = LongPortableText[number]

const block = (
  key: string,
  text: string,
  extra: Partial<Pick<Block, "style" | "listItem" | "level">> = {},
): Block => ({
  _type: "block",
  _key: key,
  style: "normal",
  markDefs: [],
  children: [{ _type: "span", _key: `${key}-s`, text, marks: [] }],
  ...extra,
})

describe("LongRichText", () => {
  it("renders nothing for empty or blank lines, whatever their number", () => {
    const { container } = renderWithRouter(
      <LongRichText
        value={[
          block("p1", "Primeiro"),
          ...Array.from({ length: 10 }, (_, index) => block(`e${index}`, "")),
          block("blank", " \t "),
          block("h2", "", { style: "h2" }),
          block("p2", "Segundo"),
        ]}
      />,
    )

    expect(container.querySelectorAll("p")).toHaveLength(2)
    expect(container.querySelectorAll("h2")).toHaveLength(0)
    expect(container).toHaveTextContent(/^PrimeiroSegundo$/)
  })

  it("renders headings at the levels the Editor chose", () => {
    renderWithRouter(
      <LongRichText
        value={[
          block("h2", "Consentimento", { style: "h2" }),
          block("h3", "Antes do evento", { style: "h3" }),
        ]}
      />,
    )

    expect(
      screen.getByRole("heading", { level: 2, name: "Consentimento" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { level: 3, name: "Antes do evento" }),
    ).toBeInTheDocument()
  })

  it("spaces headings from the block above, except a leading one", () => {
    const { container } = renderWithRouter(
      <LongRichText
        value={[
          block("p", "Um parágrafo."),
          block("h2", "Consentimento", { style: "h2" }),
          block("h3", "Antes do evento", { style: "h3" }),
        ]}
      />,
    )

    const spacing = ["mt-6", "first:mt-0"]
    expect(
      screen.getByRole("heading", { level: 2, name: "Consentimento" }),
    ).toHaveClass(...spacing)
    expect(
      screen.getByRole("heading", { level: 3, name: "Antes do evento" }),
    ).toHaveClass(...spacing)
    expect(container.querySelector("p")).not.toHaveClass("mt-6")
  })

  it("renders paragraphs and quotes", () => {
    const { container } = renderWithRouter(
      <LongRichText
        value={[
          block("p", "Um parágrafo."),
          block("q", "Uma citação.", { style: "blockquote" }),
        ]}
      />,
    )

    expect(container.querySelector("p")).toHaveTextContent("Um parágrafo.")
    expect(container.querySelector("blockquote")).toHaveTextContent(
      "Uma citação.",
    )
  })

  it("renders bullet and numbered lists", () => {
    renderWithRouter(
      <LongRichText
        value={[
          block("b1", "Pergunte antes de tocar.", {
            listItem: "bullet",
            level: 1,
          }),
          block("b2", "Não é não.", { listItem: "bullet", level: 1 }),
          block("n1", "Chegue no horário.", { listItem: "number", level: 1 }),
        ]}
      />,
    )

    const [bullets, numbers] = screen.getAllByRole("list")
    expect(bullets.tagName).toBe("UL")
    expect(bullets.querySelectorAll("li")).toHaveLength(2)
    expect(numbers.tagName).toBe("OL")
    expect(numbers).toHaveTextContent("Chegue no horário.")
  })

  it("renders bold text and links as short text does", () => {
    renderWithRouter(
      <LongRichText
        value={[
          {
            ...block("p", ""),
            markDefs: [{ _type: "link", _key: "l1", href: "/eventos" }],
            children: [
              { _type: "span", _key: "s1", text: "negrito", marks: ["strong"] },
              { _type: "span", _key: "s2", text: "os eventos", marks: ["l1"] },
            ],
          },
        ]}
      />,
    )

    expect(screen.getByText("negrito").tagName).toBe("STRONG")
    expect(screen.getByRole("link", { name: "os eventos" })).toHaveAttribute(
      "href",
      "/eventos",
    )
  })
})

const PULL_UP_UNDER_TITLE = "[:is(h2,h3,h4)+&]:-mt-6"

describe("LongRichText title levels", () => {
  const levels = [
    block("h2", "Título um", { style: "h2" }),
    block("s1", "Subtítulo um", { style: "subtitle1" }),
    block("h3", "Título dois", { style: "h3" }),
    block("s2", "Subtítulo dois", { style: "subtitle2" }),
    block("h4", "Título três", { style: "h4" }),
    block("s3", "Subtítulo três", { style: "subtitle3" }),
  ]

  it("renders the three title levels as h2, h3 and h4, each smaller", () => {
    renderWithRouter(<LongRichText value={levels} />)

    expect(
      screen.getByRole("heading", { level: 2, name: "Título um" }),
    ).toHaveClass("text-2xl", "mt-6", "first:mt-0")
    expect(
      screen.getByRole("heading", { level: 3, name: "Título dois" }),
    ).toHaveClass("text-xl", "mt-6", "first:mt-0")
    expect(
      screen.getByRole("heading", { level: 4, name: "Título três" }),
    ).toHaveClass("text-lg", "mt-6", "first:mt-0")
  })

  it.each([
    ["Subtítulo um", "text-lg"],
    ["Subtítulo dois", "text-base"],
    ["Subtítulo três", "text-base"],
  ])(
    "renders %s as a muted paragraph close under its title",
    (text, size) => {
      renderWithRouter(<LongRichText value={levels} />)

      const subtitle = screen.getByText(text)
      expect(subtitle.tagName).toBe("P")
      expect(subtitle).toHaveClass("text-muted-foreground", size)
      expect(subtitle).toHaveClass(PULL_UP_UNDER_TITLE)
      expect(subtitle).not.toHaveClass("-mt-6")
    },
  )
})

describe("LongRichText leading subtitle", () => {
  it.each(["subtitle1", "subtitle2", "subtitle3"] as const)(
    "pulls a %s up only when it follows a title",
    (style) => {
      renderWithRouter(
        <LongRichText value={[block("s", "Abre o texto", { style })]} />,
      )

      expect(screen.getByText("Abre o texto")).toHaveClass(
        PULL_UP_UNDER_TITLE,
      )
    },
  )
})
