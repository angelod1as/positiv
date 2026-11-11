import { useMemo } from "react"
import type {
  ConversionFunnelDataPoint,
  EventAttendanceDataPoint,
  EventRevenueDataPoint,
  OccupancyDataPoint,
  SeasonalityDataPoint,
  VeteranRookieDataPoint,
} from "~/business/reporting/dataviz/dataviz.types"
import { adminDatavizCopy } from "~/copy/admin/dataviz"
import { buildEventLabel } from "./chart-utils"
import { useBrushState } from "~/lib/hooks/use-brush-state"
import { DatavizChart } from "./dataviz-chart"
import {
  attendanceChart,
  conversionChart,
  funnelChart,
  occupancyChart,
  revenueChart,
  seasonalityChart,
  ticketChart,
  veteranRookieChart,
} from "./dataviz-charts"
import { DatavizHeading } from "./dataviz-heading"
import { EventRangeSelector } from "./event-range-selector"

const eventsCopy = adminDatavizCopy.eventsSection

interface EventsSectionProps {
  attendance: EventAttendanceDataPoint[]
  revenue: EventRevenueDataPoint[]
  funnel: ConversionFunnelDataPoint[]
  occupancy: OccupancyDataPoint[]
  veteranRookie: VeteranRookieDataPoint[]
  seasonality: SeasonalityDataPoint[]
}

export function EventsSection({
  attendance,
  revenue,
  funnel,
  occupancy,
  veteranRookie,
  seasonality,
}: EventsSectionProps) {
  const { startIndex, endIndex, onChange } = useBrushState(attendance.length)

  const brushPreviewData = useMemo(
    () =>
      attendance.map((item) => ({
        label: buildEventLabel(item),
        inscritos: item.inscritos,
      })),
    [attendance],
  )

  const charts = useMemo(() => {
    const from = attendance[startIndex]?.date
    const to = attendance[endIndex]?.date
    const inRange = <T extends { date: string }>(data: T[]) =>
      from && to ? data.filter((item) => item.date >= from && item.date <= to) : []
    return [
      attendanceChart(inRange(attendance)),
      revenueChart(inRange(revenue)),
      ticketChart(inRange(revenue)),
      funnelChart(inRange(funnel)),
      conversionChart(inRange(funnel)),
      occupancyChart(inRange(occupancy)),
      veteranRookieChart(inRange(veteranRookie)),
      seasonalityChart(seasonality),
    ]
  }, [attendance, revenue, funnel, occupancy, veteranRookie, seasonality, startIndex, endIndex])

  return (
    <div>
      <DatavizHeading title={eventsCopy.title}>
        <EventRangeSelector
          data={brushPreviewData}
          startIndex={startIndex}
          endIndex={endIndex}
          onChange={onChange}
        />
      </DatavizHeading>
      {charts.map((content) => (
        <DatavizChart key={content._key} content={content} />
      ))}
    </div>
  )
}
