import type {
  ConversionFunnelDataPoint,
  EventAttendanceDataPoint,
  KpiScores,
  OccupancyDataPoint,
  PartySummary,
  SeasonalityDataPoint,
  TimingDataPoint,
} from '~/business/reporting/dataviz/dataviz.types'
import { StatsSection } from '~/components/pages/page/sections/stats-section'
import { adminDatavizCopy } from '~/copy/admin/dataviz'
import { DatavizChart } from './dataviz-chart'
import {
  attendanceChart,
  conversionChart,
  funnelChart,
  occupancyChart,
  seasonalityChart,
  timingChart,
} from './dataviz-charts'
import { DatavizHeading } from './dataviz-heading'
import { internalChart, stat, statsGroup } from './stat-cards'

const copy = adminDatavizCopy.chapters.parties

type PartiesChapterProps = {
  summary: PartySummary
  kpis: KpiScores
  attendance: EventAttendanceDataPoint[]
  funnel: ConversionFunnelDataPoint[]
  occupancy: OccupancyDataPoint[]
  timing: TimingDataPoint[]
  seasonality: SeasonalityDataPoint[]
}

export function PartiesChapter({
  summary,
  kpis,
  attendance,
  funnel,
  occupancy,
  timing,
  seasonality,
}: PartiesChapterProps) {
  const report = statsGroup('parties', null, [
    stat('acceptance', summary.acceptance_rate, copy.acceptance, 'percent'),
    stat('per-party', summary.avg_people_per_party, copy.perParty),
    stat('fullest', summary.max_people_per_party, copy.fullest),
  ])
  const notSelected = attendance.reduce((sum, party) => sum + party.not_selected, 0)
  const operation = statsGroup('operation', adminDatavizCopy.internal(copy.operationTitle), [
    stat('no-show', kpis.avg_no_show_rate, copy.noShow, 'percent'),
    stat('occupancy', kpis.avg_occupancy_pct, copy.occupancy, 'percent'),
    stat('not-selected', notSelected, copy.notSelected),
  ])
  const internal = [
    funnelChart(funnel),
    conversionChart(funnel),
    occupancyChart(occupancy),
    timingChart(timing),
    seasonalityChart(seasonality),
  ].map(internalChart)

  return (
    <div>
      <DatavizHeading title={copy.title} />
      <DatavizChart content={attendanceChart(attendance)} />
      <StatsSection content={report} />
      <StatsSection content={operation} />
      {internal.map((content) => (
        <DatavizChart key={content._key} content={content} />
      ))}
    </div>
  )
}
