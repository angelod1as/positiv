import type {
  ConversionFunnelDataPoint,
  EventAttendanceDataPoint,
  EventRevenueDataPoint,
  OccupancyDataPoint,
  SeasonalityDataPoint,
  VeteranRookieDataPoint,
} from "~/business/reporting/dataviz/dataviz.types"
import { adminDatavizCopy } from "~/copy/admin/dataviz"
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
  const charts = [
    attendanceChart(attendance),
    revenueChart(revenue),
    ticketChart(revenue),
    funnelChart(funnel),
    conversionChart(funnel),
    occupancyChart(occupancy),
    veteranRookieChart(veteranRookie),
    seasonalityChart(seasonality),
  ]

  return (
    <div>
      <DatavizHeading title={eventsCopy.title} />
      {charts.map((content) => (
        <DatavizChart key={content._key} content={content} />
      ))}
    </div>
  )
}
