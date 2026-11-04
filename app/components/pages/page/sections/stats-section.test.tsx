import { describe, expect, it } from "vitest"
import type { PageSection } from "~/business/cms/page.schema"
import { homepageCopy } from "~/copy/homepage"
import { render, screen, within } from "~/test/test-utils"
import { StatsSection } from "./stats-section"

type Content = Extract<PageSection, { _type: "statsSection" }>
type Card = Content["cards"][number]

const bigNumber: Card = {
  _type: "statNumber",
  _key: "budget",
  unit: "brl",
  value: 12400,
  caption: "investidos em infraestrutura",
}

const range: Card = {
  _type: "statRange",
  _key: "age",
  unit: "none",
  min: 19,
  average: 31.4,
  max: 64,
  caption: "anos de idade",
}

const comparison: Card = {
  _type: "statComparison",
  _key: "newcomers",
  unit: "percent",
  before: 22,
  beforeLabel: "2025",
  after: 31,
  afterLabel: "2026",
  caption: "de novates",
}

const content: Content = {
  _type: "statsSection",
  _key: "stats",
  title: "O ano em números",
  cards: [bigNumber, range, comparison],
}

const cardFor = (caption: string) => {
  const card = screen.getByText(caption).closest("li")
  if (!card) throw new Error(`No card captioned ${caption}`)
  return within(card)
}

describe("StatsSection", () => {
  it("renders the Editor's title", () => {
    render(<StatsSection content={content} />)

    expect(
      screen.getByRole("heading", { level: 2, name: "O ano em números" }),
    ).toBeInTheDocument()
  })

  it("renders no title when the Editor left it empty", () => {
    render(<StatsSection content={{ ...content, title: null }} />)

    expect(screen.queryByRole("heading", { level: 2 })).toBeNull()
  })

  it("renders every card in order, as a list", () => {
    render(<StatsSection content={content} />)

    expect(screen.getAllByRole("listitem")).toHaveLength(3)
  })

  it("writes a big number in full, in its unit, above its caption", () => {
    render(<StatsSection content={content} />)

    expect(
      cardFor("investidos em infraestrutura").getByText("R$ 12.400"),
    ).toBeInTheDocument()
  })

  it("writes a range's minimum, average and maximum, each labelled", () => {
    render(<StatsSection content={content} />)

    const card = cardFor("anos de idade")
    expect(card.getByText("31,4")).toBeInTheDocument()
    expect(card.getByText("19")).toBeInTheDocument()
    expect(card.getByText("64")).toBeInTheDocument()
    expect(card.getByText(homepageCopy.stats.min)).toBeInTheDocument()
    expect(card.getByText(homepageCopy.stats.average)).toBeInTheDocument()
    expect(card.getByText(homepageCopy.stats.max)).toBeInTheDocument()
  })

  it("writes both periods of a comparison and the change between them", () => {
    render(<StatsSection content={content} />)

    const card = cardFor("de novates")
    expect(card.getByText("2025")).toBeInTheDocument()
    expect(card.getByText("22%")).toBeInTheDocument()
    expect(card.getByText("2026")).toBeInTheDocument()
    expect(card.getByText("31%")).toBeInTheDocument()
    expect(card.getByText("+9 p.p.")).toBeInTheDocument()
  })

  it("leads a comparison with the change, then its caption", () => {
    render(<StatsSection content={content} />)

    const card = screen.getByText("de novates").closest("li")
    expect(card?.textContent).toMatch(/^\+9 p\.p\.de novates/)
  })

  it("leads a comparison from zero with the current value and no change", () => {
    render(
      <StatsSection
        content={{
          ...content,
          cards: [
            {
              ...comparison,
              unit: "none",
              before: 0,
              after: 40,
              caption: "vagas sociais",
            },
          ],
        }}
      />,
    )

    const card = screen.getByText("vagas sociais").closest("li")
    expect(card?.textContent).toMatch(/^40vagas sociais/)
    expect(card?.textContent).not.toMatch(/[+%]|p\.p\./)
  })

  it("puts every card's caption right after its headline value", () => {
    render(<StatsSection content={content} />)

    expect(
      screen.getByText("investidos em infraestrutura").closest("li")
        ?.textContent,
    ).toMatch(/^R\$ 12\.400investidos em infraestrutura/)
    expect(
      screen.getByText("anos de idade").closest("li")?.textContent,
    ).toMatch(/31,4anos de idade/)
  })

  const markerOf = (caption: string) =>
    screen
      .getByText(caption)
      .closest("li")
      ?.querySelector<HTMLElement>("[style*='left']")

  it.each([
    ["above its maximum", { min: 10, average: 80, max: 40 }, "100%"],
    ["below its minimum", { min: 10, average: 2, max: 40 }, "0%"],
    ["with no span", { min: 30, average: 30, max: 30 }, "50%"],
  ])(
    "keeps the marker of a range %s on the track",
    (_, values, left) => {
      render(
        <StatsSection
          content={{ ...content, cards: [{ ...range, ...values }] }}
        />,
      )

      expect(markerOf("anos de idade")?.style.left).toBe(left)
    },
  )

  it("draws no bars for a comparison with a negative value", () => {
    render(
      <StatsSection
        content={{
          ...content,
          cards: [
            {
              ...comparison,
              unit: "brl",
              before: -2000,
              after: 3000,
              caption: "de resultado",
            },
          ],
        }}
      />,
    )

    expect(
      screen.getByText("de resultado").closest("li")?.querySelector(
        "[style*='width']",
      ),
    ).toBeNull()
    const card = cardFor("de resultado")
    expect(card.getByText("-R$ 2.000")).toBeInTheDocument()
    expect(card.getByText("R$ 3.000")).toBeInTheDocument()
  })

  it.each([
    [1250, "1.250", "text-4xl"],
    [12400, "R$ 12.400", "text-4xl"],
    [123750, "R$ 123.750", "text-3xl"],
    [23750.5, "R$ 23.750,50", "text-3xl"],
    [123750.5, "R$ 123.750,50", "text-2xl"],
    [1234567.89, "R$ 1.234.567,89", "text-2xl"],
    [-1234567.89, "-R$ 1.234.567,89", "text-xl"],
  ])(
    "sizes the headline %s to fit its card",
    (value, written, size) => {
      render(
        <StatsSection
          content={{
            ...content,
            cards: [{ ...bigNumber, unit: written.includes("R$") ? "brl" : "none", value }],
          }}
        />,
      )

      expect(screen.getByText(written)).toHaveClass(size)
    },
  )
})
