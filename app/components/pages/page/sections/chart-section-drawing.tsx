import { ReferenceDot } from "recharts"
import { BarChart } from "~/components/molecules/charts/bar-chart"
import { LineChart } from "~/components/molecules/charts/line-chart"
import type { ChartConfig, ChartDataPoint } from "~/types/chart.types"
import { chartColor, chartHighlight } from "./chart-color"
import type { ChartContent } from "./chart-section"

type ChartSectionDrawingProps = {
  content: ChartContent
  chartType: "bar" | "horizontalBar" | "line"
  format: (value: number) => string
}

const LABEL = "label"

// Recharts gives the labels of a horizontal chart a fixed 60px and cuts the
// rest, so the column grows with the longest label, up to a limit. The
// width is an estimate, about 7px a character at the axis' text size.
const labelColumnWidth = (rows: ChartContent["rows"]) => {
  const longest = Math.max(...rows.map((row) => row.label.length))
  return Math.min(200, Math.max(60, longest * 7 + 16))
}
const seriesKey = (index: number) => `s${index}`

// Loaded on demand by the Chart Section, so Recharts reaches the browser
// only on a Page that draws one of these charts.
export const ChartSectionDrawing = ({
  content,
  chartType,
  format,
}: ChartSectionDrawingProps) => {
  const data = content.rows.map((row) => {
    const point: ChartDataPoint = { [LABEL]: row.label }
    row.values.forEach((value, index) => {
      point[seriesKey(index)] = value
    })
    return point
  })
  const config: ChartConfig = Object.fromEntries(
    content.series.map((name, index) => [
      seriesKey(index),
      { label: name, color: chartColor(index) },
    ]),
  )
  const highlighted = content.rows.find((row) => row.highlight)
  const shared = {
    data,
    config,
    xAxisKey: LABEL,
    animated: false,
    accessibilityLayer: false,
    showLegend: content.series.length > 1,
    valueFormatter: format,
  }

  if (chartType === "line") {
    return (
      <LineChart
        {...shared}
        series={content.series.map((_, index) => ({
          dataKey: seriesKey(index),
        }))}
        curved={false}
        className="h-full"
      >
        {highlighted?.values.map((value, index) => (
          <ReferenceDot
            key={index}
            x={highlighted.label}
            y={value}
            r={6}
            fill={chartHighlight}
            stroke="var(--background)"
            strokeWidth={2}
          />
        ))}
      </LineChart>
    )
  }

  const cellColors = highlighted
    ? content.rows.map((row) => (row.highlight ? chartHighlight : undefined))
    : undefined

  return (
    <BarChart
      {...shared}
      series={content.series.map((_, index) => ({
        dataKey: seriesKey(index),
        cellColors,
      }))}
      horizontal={chartType === "horizontalBar"}
      className="h-full"
      categoryAxisWidth={labelColumnWidth(content.rows)}
    />
  )
}
