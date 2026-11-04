import { describe, expect, it } from "vitest"
import { render, screen, within } from "~/test/test-utils"
import { ProportionBar } from "./proportion-bar"

const format = (value: number) => `R$ ${value}`

const parts = [
  { key: "bar", label: "Bar", value: 60 },
  { key: "venue", label: "Espaço", value: 35, highlight: true },
  { key: "tips", label: "Gorjetas", value: 5 },
]

const segments = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>("[data-part]"))

describe("ProportionBar", () => {
  it("sizes each part by its share of the whole", () => {
    const { container } = render(<ProportionBar parts={parts} format={format} />)

    expect(segments(container).map((part) => part.style.flexBasis)).toEqual([
      "60%",
      "35%",
      "5%",
    ])
  })

  it("colours the parts in palette order and the highlight in its own colour", () => {
    const { container } = render(<ProportionBar parts={parts} format={format} />)

    expect(
      segments(container).map((part) => part.style.backgroundColor),
    ).toEqual(["var(--chart-1)", "var(--chart-highlight)", "var(--chart-3)"])
  })

  it("writes a part of 8% or more inside its segment", () => {
    const { container } = render(<ProportionBar parts={parts} format={format} />)
    const [bar, venue] = segments(container)

    expect(within(bar).getByText("Bar")).toBeInTheDocument()
    expect(within(bar).getByText("R$ 60")).toBeInTheDocument()
    expect(within(venue).getByText("Espaço")).toBeInTheDocument()
  })

  it("lists a part under 8% beside the bar, with its colour and value", () => {
    const { container } = render(<ProportionBar parts={parts} format={format} />)
    const [, , tips] = segments(container)

    expect(tips).toBeEmptyDOMElement()
    const item = screen.getByRole("listitem")
    expect(item).toHaveTextContent("Gorjetas")
    expect(item).toHaveTextContent("R$ 5")
    expect(
      item.querySelector<HTMLElement>("[data-swatch]")?.style.backgroundColor,
    ).toBe("var(--chart-3)")
  })

  it("leaves the list out when every part fits inside the bar", () => {
    render(
      <ProportionBar
        parts={[
          { key: "a", label: "A", value: 1 },
          { key: "b", label: "B", value: 1 },
        ]}
        format={format}
      />,
    )

    expect(screen.queryByRole("list")).not.toBeInTheDocument()
  })

  it("draws a negative part as nothing rather than breaking the whole", () => {
    const { container } = render(
      <ProportionBar
        parts={[
          { key: "a", label: "A", value: 3 },
          { key: "b", label: "B", value: -1 },
        ]}
        format={format}
      />,
    )

    expect(segments(container).map((part) => part.style.flexBasis)).toEqual([
      "100%",
      "0%",
    ])
  })
})
