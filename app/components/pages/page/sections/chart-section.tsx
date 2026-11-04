import { lazy, Suspense, useId, useState } from "react"
import type { PageSection } from "~/business/cms/page.schema"
import { Button } from "~/components/ui/button"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table"
import { homepageCopy } from "~/copy/homepage"
import { formatStatValue } from "~/lib/helpers/format-stat"
import { ProportionBar } from "./proportion-bar"
import { SectionTitle } from "./section-title"

export type ChartContent = Extract<PageSection, { _type: "chartSection" }>

type ChartSectionProps = {
  content: ChartContent
}

const ChartSectionDrawing = lazy(() =>
  import("./chart-section-drawing").then((module) => ({
    default: module.ChartSectionDrawing,
  })),
)

// The drawing is hidden from screen readers and keyboards: they get the
// title and the Resumo, and anyone can open the same data as a table.
export const ChartSection = ({ content }: ChartSectionProps) => {
  const [showData, setShowData] = useState(false)
  const tableId = useId()
  const format = (value: number) => formatStatValue(value, content.unit)

  return (
    <section className="w-full px-4 py-12 md:px-6 md:py-16">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <SectionTitle>{content.title}</SectionTitle>
        <p className="mx-auto max-w-[700px] text-center text-muted-foreground md:text-xl">
          {content.summary}
        </p>
        <div aria-hidden="true" inert>
          {content.chartType === "proportion" ? (
            <ProportionBar
              format={format}
              parts={content.rows.map((row) => ({
                key: row._key,
                label: row.label,
                value: row.values[0] ?? 0,
                highlight: row.highlight,
              }))}
            />
          ) : (
            <Suspense fallback={<div className="h-[350px]" />}>
              <ChartSectionDrawing
                content={content}
                chartType={content.chartType}
                format={format}
              />
            </Suspense>
          )}
        </div>
        <div className="flex flex-col items-center gap-4">
          <Button
            variant="outline"
            aria-expanded={showData}
            aria-controls={tableId}
            onClick={() => setShowData((shown) => !shown)}
          >
            {showData
              ? homepageCopy.chart.hideData
              : homepageCopy.chart.viewData}
          </Button>
          <div id={tableId} className="w-full">
            {showData && <DataTable content={content} format={format} />}
          </div>
        </div>
      </div>
    </section>
  )
}

const DataTable = ({
  content,
  format,
}: {
  content: ChartContent
  format: (value: number) => string
}) => (
  <Table>
    <TableCaption className="sr-only">{content.title}</TableCaption>
    <TableHeader>
      <TableRow>
        <TableCell />
        {content.series.map((name, index) => (
          <TableHead key={index} scope="col" className="text-right">
            {name}
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
    <TableBody>
      {content.rows.map((row) => (
        <TableRow key={row._key}>
          <TableHead scope="row">{row.label}</TableHead>
          {content.series.map((_, index) => {
            const value = row.values[index]
            return (
              <TableCell key={index} className="text-right tabular-nums">
                {value === undefined ? "" : format(value)}
              </TableCell>
            )
          })}
        </TableRow>
      ))}
    </TableBody>
  </Table>
)
