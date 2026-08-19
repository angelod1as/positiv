import { useMemo } from "react"
import type {
  ConversionFunnelDataPoint,
  EventAttendanceDataPoint,
  EventRevenueDataPoint,
  OccupancyDataPoint,
} from "~/business/admin/dataviz/dataviz.types"
import { ChartSection } from "~/components/atoms/charts/chart-section"
import { adminDatavizCopy } from "~/copy/admin/dataviz"
import { buildEventLabel } from "~/lib/helpers/chart-utils"
import { useBrushState } from "~/lib/hooks/use-brush-state"
import { AttendanceChart } from "./attendance-chart"
import { EventRangeSelector } from "./event-range-selector"
import { FunnelChart } from "./funnel-chart"
import { OccupancyChart } from "./occupancy-chart"
import { RevenueChart } from "./revenue-chart"

const eventsCopy = adminDatavizCopy.eventsSection

interface EventsSectionProps {
  attendance: EventAttendanceDataPoint[]
  revenue: EventRevenueDataPoint[]
  funnel: ConversionFunnelDataPoint[]
  occupancy: OccupancyDataPoint[]
}

export function EventsSection({
  attendance,
  revenue,
  funnel,
  occupancy,
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

  const slicedAttendance = useMemo(
    () => attendance.slice(startIndex, endIndex + 1),
    [attendance, startIndex, endIndex],
  )

  const slicedRevenue = useMemo(
    () => revenue.slice(startIndex, endIndex + 1),
    [revenue, startIndex, endIndex],
  )

  const slicedFunnel = useMemo(
    () => funnel.slice(startIndex, endIndex + 1),
    [funnel, startIndex, endIndex],
  )

  const slicedOccupancy = useMemo(
    () => occupancy.slice(startIndex, endIndex + 1),
    [occupancy, startIndex, endIndex],
  )

  return (
    <section className="space-y-8">
      <h2 className="text-2xl font-semibold">{eventsCopy.title}</h2>
      <EventRangeSelector
        data={brushPreviewData}
        startIndex={startIndex}
        endIndex={endIndex}
        onChange={onChange}
      />
      <ChartSection
        title={eventsCopy.attendance.title}
        description={eventsCopy.attendance.description}
      >
        <AttendanceChart data={slicedAttendance} />
      </ChartSection>
      <ChartSection
        title={eventsCopy.revenue.title}
        description={eventsCopy.revenue.description}
      >
        <RevenueChart data={slicedRevenue} />
      </ChartSection>
      <ChartSection
        title={eventsCopy.funnel.title}
        description={eventsCopy.funnel.description}
      >
        <FunnelChart data={slicedFunnel} />
      </ChartSection>
      <ChartSection
        title={eventsCopy.occupancy.title}
        description={eventsCopy.occupancy.description}
      >
        <OccupancyChart data={slicedOccupancy} />
      </ChartSection>
    </section>
  )
}
