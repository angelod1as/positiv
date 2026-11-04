import userEvent from "@testing-library/user-event"
import { cloneElement, isValidElement } from "react"
import { describe, expect, it, vi } from "vitest"
import {
  type PageSection,
  pageSectionDocumentSchema,
} from "~/business/cms/page.schema"
import { sections } from "~/test/page-documents"
import { render, screen, waitFor, within } from "~/test/test-utils"
import { ChartSection } from "./chart-section"

vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts")
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) =>
      isValidElement<{ width?: number; height?: number }>(children)
        ? cloneElement(children, { width: 500, height: 300 })
        : children,
  }
})

type Content = Extract<PageSection, { _type: "chartSection" }>

const chart = (overrides: Partial<Content> = {}): Content => {
  const parsed = pageSectionDocumentSchema.parse({
    ...sections.chartSection,
    ...overrides,
  })
  if (parsed._type !== "chartSection") throw new Error("Not a chart")
  return parsed
}

const budget = chart({
  title: "Para onde foi o dinheiro",
  summary: "Quase dois terços foram para o espaço.",
  chartType: "proportion",
  unit: "brl",
  series: ["Gastos"],
  rows: [
    { _key: "venue", label: "Espaço", values: [12400], highlight: true },
    { _key: "staff", label: "Equipe", values: [6000] },
    { _key: "tips", label: "Gorjetas", values: [500] },
  ],
})

const chartFrame = (container: HTMLElement) =>
  container.querySelector("[data-chart]")

describe("ChartSection", () => {
  it("shows the title and the Resumo", () => {
    render(<ChartSection content={chart()} />)

    expect(
      screen.getByRole("heading", { level: 2, name: "Festas por ano" }),
    ).toBeInTheDocument()
    expect(
      screen.getByText("As festas mais que dobraram de 2023 para 2025."),
    ).toBeVisible()
  })

  it("hides the drawing from screen readers and keyboards", () => {
    render(<ChartSection content={budget} />)

    const drawing = screen.getByText("Espaço").closest("[aria-hidden]")
    expect(drawing).toHaveAttribute("aria-hidden", "true")
    expect(drawing).toHaveAttribute("inert")
  })

  describe("Ver dados", () => {
    it("starts closed", () => {
      render(<ChartSection content={budget} />)

      expect(screen.getByRole("button", { name: "Ver dados" })).toHaveAttribute(
        "aria-expanded",
        "false",
      )
      expect(screen.queryByRole("table")).not.toBeInTheDocument()
    })

    it("opens a table of the same data, written in full", async () => {
      render(<ChartSection content={budget} />)

      await userEvent.click(screen.getByRole("button", { name: "Ver dados" }))

      const table = screen.getByRole("table", {
        name: "Para onde foi o dinheiro",
      })
      expect(
        within(table).getByRole("columnheader", { name: "Gastos" }),
      ).toBeInTheDocument()
      const venue = within(table).getByRole("row", { name: /Espaço/ })
      expect(
        within(venue).getByRole("rowheader", { name: "Espaço" }),
      ).toBeInTheDocument()
      expect(within(venue).getByRole("cell")).toHaveTextContent("R$ 12.400")
    })

    it("closes again", async () => {
      render(<ChartSection content={budget} />)

      await userEvent.click(screen.getByRole("button", { name: "Ver dados" }))
      await userEvent.click(
        screen.getByRole("button", { name: "Esconder dados" }),
      )

      expect(screen.queryByRole("table")).not.toBeInTheDocument()
    })

    it("leaves a cell empty where a row lacks a value", async () => {
      render(
        <ChartSection
          content={chart({
            series: ["Novates", "Veteranes"],
            rows: [{ _key: "a", label: "2025", values: [3] }],
          })}
        />,
      )

      await userEvent.click(screen.getByRole("button", { name: "Ver dados" }))

      const cells = within(screen.getByRole("row", { name: /2025/ })).getAllByRole(
        "cell",
      )
      expect(cells.map((cell) => cell.textContent)).toEqual(["3", ""])
    })
  })

  describe("100% bar", () => {
    it("draws the parts without loading the chart library", () => {
      const { container } = render(<ChartSection content={budget} />)

      expect(screen.getByText("Equipe")).toBeInTheDocument()
      expect(chartFrame(container)).not.toBeInTheDocument()
    })
  })

  describe("vertical bar", () => {
    it("draws every bar at once, labelled along the bottom", async () => {
      const { container } = render(<ChartSection content={chart()} />)

      await waitFor(() =>
        expect(
          container.querySelectorAll(".recharts-bar-rectangle path"),
        ).toHaveLength(3),
      )
      expect(container.querySelector(".recharts-xAxis-tick-labels")).toHaveTextContent(
        "2023",
      )
    })

    it("paints the highlighted row in the highlight colour", async () => {
      const { container } = render(<ChartSection content={chart()} />)

      await waitFor(() =>
        expect(
          container.querySelectorAll(".recharts-bar-rectangle path"),
        ).toHaveLength(3),
      )
      const fills = Array.from(
        container.querySelectorAll(".recharts-bar-rectangle path"),
      ).map((bar) => bar.getAttribute("fill"))
      expect(fills[2]).toBe("var(--chart-highlight)")
      expect(fills.slice(0, 2)).not.toContain("var(--chart-highlight)")
    })

    it("writes the value axis in the unit", async () => {
      const { container } = render(
        <ChartSection content={chart({ unit: "percent" })} />,
      )

      await waitFor(() =>
        expect(container.querySelector(".recharts-yAxis-tick-labels")).toHaveTextContent(
          "%",
        ),
      )
    })

    it("names the series in a legend when there are several", async () => {
      const { container } = render(
        <ChartSection
          content={chart({
            series: ["Novates", "Veteranes"],
            rows: [{ _key: "a", label: "2025", values: [3, 5] }],
          })}
        />,
      )

      await waitFor(() => expect(chartFrame(container)).toBeInTheDocument())
      expect(container.querySelector("[data-chart]")).toHaveTextContent(
        "Veteranes",
      )
    })
  })

  describe("horizontal bar", () => {
    it("lists the rows down the side", async () => {
      const { container } = render(
        <ChartSection content={chart({ chartType: "horizontalBar" })} />,
      )

      await waitFor(() =>
        expect(
          container.querySelectorAll(".recharts-bar-rectangle path"),
        ).toHaveLength(3),
      )
      expect(container.querySelector(".recharts-yAxis-tick-labels")).toHaveTextContent(
        "2023",
      )
    })
  })

  describe("line", () => {
    it("draws the whole line at once and marks the highlighted row", async () => {
      const { container } = render(
        <ChartSection content={chart({ chartType: "line" })} />,
      )

      await waitFor(() =>
        expect(
          container.querySelector(".recharts-line-curve"),
        ).toBeInTheDocument(),
      )
      expect(container.querySelector(".recharts-line-curve")).not.toHaveAttribute(
        "stroke-dasharray",
      )
      expect(
        container.querySelector(".recharts-reference-line line"),
      ).toHaveAttribute("stroke", "var(--chart-highlight)")
    })
  })
})
