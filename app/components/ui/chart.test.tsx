import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ChartContainer, ChartTooltipContent } from "./chart"

vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts")
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) =>
      children,
  }
})

const tooltip = (props: Partial<Parameters<typeof ChartTooltipContent>[0]>) =>
  render(
    <ChartContainer config={{ spend: { label: "Gastos" } }}>
      <ChartTooltipContent
        active
        hideLabel
        payload={[{ dataKey: "spend", name: "spend", value: 12400 }]}
        {...props}
      />
    </ChartContainer>,
  )

describe("ChartTooltipContent", () => {
  it("writes a value with the value formatter, beside its series label", () => {
    tooltip({ valueFormatter: (value) => `R$ ${value}` })

    expect(screen.getByText("Gastos")).toBeInTheDocument()
    expect(screen.getByText("R$ 12400")).toBeInTheDocument()
  })

  it("writes a value in the browser's locale without one", () => {
    tooltip({})

    expect(screen.getByText((12400).toLocaleString())).toBeInTheDocument()
  })
})
