import { format, isValid, parse } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type {
  ConversionFunnelDataPoint,
  DemographicDistribution,
  EventAttendanceDataPoint,
  EventRevenueDataPoint,
  GrowthDataPoint,
  KpiScores,
  OccupancyDataPoint,
  RetentionDataPoint,
  SeasonalityDataPoint,
  VeteranRookieDataPoint,
} from '~/business/admin/dataviz/dataviz.types'
import type { ChartContent } from '~/components/pages/page/sections/chart-section'
import { adminDatavizCopy as copy } from '~/copy/admin/dataviz'
import { buildEventLabel, groupSmallCategories, sortByAgeRange } from '~/lib/helpers/chart-utils'

type Row = ChartContent['rows'][number]
type Fields = Pick<ChartContent, 'title' | 'summary' | 'chartType' | 'unit' | 'series'>

const chart = (_key: string, fields: Fields, rows: Omit<Row, '_key'>[]): ChartContent => ({
  _type: 'chartSection',
  _key,
  ...fields,
  rows: rows.map((row, index) => ({ _key: String(index), ...row })),
})

const withNote = (text: string, note: string) => `${text} ${note}.`

const eventLabel = (event: { emoji: string; title: string; date: string }) =>
  buildEventLabel(event).replaceAll('\n', ' · ')

const MIGRATION_MONTH = '2025-07'

const RETENTION_GROUPED_FROM = 7

function formatMonth(monthString: string): string {
  const date = parse(monthString, 'yyyy-MM', new Date())
  return isValid(date) ? format(date, 'MMM/yy', { locale: ptBR }) : monthString
}

const reais = (cents: number) => cents / 100

const share = (value: number, total: number) =>
  total === 0 ? 0 : Math.round((value / total) * 100)

const withShare = (label: string, value: number, total: number) =>
  copy.kpiScores.withNote(label, `${share(value, total)}%`)

const community = copy.communitySection
const events = copy.eventsSection

type Demographic = 'gender' | 'orientation' | 'race'

export function demographicChart(
  key: Demographic,
  data: DemographicDistribution[],
): ChartContent {
  const total = data.reduce((sum, item) => sum + item.count, 0)
  const note = key === 'race' ? copy.raceChart.filledProfiles(total) : copy.charts.people(total)

  return chart(
    key,
    {
      title: community[key].title,
      summary: withNote(community[key].description, note),
      chartType: 'horizontalBar',
      unit: 'percent',
      series: [copy.charts.share],
    },
    groupSmallCategories(data).map((item) => ({
      label: copy.charts.answer(item.category, item.count),
      values: [item.percentage],
    })),
  )
}

export function ageChart(
  data: DemographicDistribution[],
  profiles: { filled: number; total: number },
): ChartContent {
  return chart(
    'age',
    {
      title: community.age.title,
      summary: withNote(
        community.age.description,
        copy.ageChart.filledProfiles(profiles.filled, profiles.total),
      ),
      chartType: 'horizontalBar',
      unit: 'none',
      series: [copy.retentionChart.people],
    },
    sortByAgeRange(data).map((item) => ({ label: item.category, values: [item.count] })),
  )
}

export function retentionChart(data: RetentionDataPoint[]): ChartContent {
  const total = data.reduce((sum, point) => sum + point.num_people, 0)
  const fewer = data
    .filter((point) => point.events_attended < RETENTION_GROUPED_FROM)
    .sort((a, b) => a.events_attended - b.events_attended)
    .map((point) => ({ label: String(point.events_attended), values: [point.num_people] }))
  const sevenAndUp = data.filter((point) => point.events_attended >= RETENTION_GROUPED_FROM)
  const rows =
    sevenAndUp.length > 0
      ? [
          ...fewer,
          {
            label: copy.retentionChart.sevenPlus,
            values: [sevenAndUp.reduce((sum, point) => sum + point.num_people, 0)],
          },
        ]
      : fewer

  return chart(
    'retention',
    {
      title: community.retention.title,
      summary: withNote(community.retention.description, copy.retentionChart.total(total)),
      chartType: 'bar',
      unit: 'none',
      series: [copy.retentionChart.people],
    },
    rows,
  )
}

export function newProfilesChart(data: GrowthDataPoint[]): ChartContent {
  const migrated = data.some((item) => item.month === MIGRATION_MONTH)

  return chart(
    'new-profiles',
    {
      title: copy.growthChart.newProfiles,
      summary: migrated
        ? `${copy.charts.newProfilesSummary} ${copy.charts.migrationNote}`
        : copy.charts.newProfilesSummary,
      chartType: 'bar',
      unit: 'none',
      series: [copy.growthChart.newProfiles],
    },
    data.map((item) => ({
      label: formatMonth(item.month),
      values: [item.new_profiles],
      ...(item.month === MIGRATION_MONTH && { highlight: true }),
    })),
  )
}

export function cumulativeGrowthChart(data: GrowthDataPoint[]): ChartContent {
  return chart(
    'cumulative',
    {
      title: copy.growthChart.cumulative,
      summary: copy.charts.cumulativeSummary,
      chartType: 'line',
      unit: 'none',
      series: [copy.growthChart.cumulative],
    },
    data.map((item) => ({ label: formatMonth(item.month), values: [item.cumulative] })),
  )
}

const attendanceSeries = [
  ['inscritos', copy.attendanceChart.series.applications],
  ['compareceram', copy.attendanceChart.series.attended],
  ['nao_foram', copy.attendanceChart.series.didNotAttend],
  ['withdrew', copy.attendanceChart.series.withdrew],
  ['not_selected', copy.attendanceChart.series.notSelected],
  ['rodizio', copy.attendanceChart.series.rotation],
  ['vagas_sociais', copy.attendanceChart.series.socialSpots],
  ['staff', copy.attendanceChart.series.staff],
] as const

export function attendanceChart(data: EventAttendanceDataPoint[]): ChartContent {
  return chart(
    'attendance',
    {
      title: events.attendance.title,
      summary: events.attendance.description,
      chartType: 'line',
      unit: 'none',
      series: attendanceSeries.map(([, label]) => label),
    },
    data.map((item) => ({
      label: eventLabel(item),
      values: attendanceSeries.map(([key]) => item[key]),
    })),
  )
}

export function revenueChart(data: EventRevenueDataPoint[]): ChartContent {
  return chart(
    'revenue',
    {
      title: events.revenue.title,
      summary: copy.charts.revenueSummary,
      chartType: 'bar',
      unit: 'brl',
      series: [copy.revenueChart.revenue, copy.revenueChart.grossRevenue],
    },
    data.map((item) => ({
      label: eventLabel(item),
      values: [reais(item.faturamento_total), reais(item.faturamento_bruto)],
    })),
  )
}

export function ticketChart(data: EventRevenueDataPoint[]): ChartContent {
  return chart(
    'ticket',
    {
      title: copy.revenueChart.ticketPrice,
      summary: copy.charts.ticketSummary,
      chartType: 'line',
      unit: 'brl',
      series: [copy.revenueChart.ticketPrice, copy.revenueChart.averageTicket],
    },
    data.map((item) => ({
      label: eventLabel(item),
      values: [
        reais(item.ticket_price),
        item.num_pagantes > 0 ? reais(item.faturamento_total / item.num_pagantes) : 0,
      ],
    })),
  )
}

const funnelSteps = [
  ['inscritos', copy.funnelChart.applications],
  ['finalizados', copy.funnelChart.finalised],
  ['pagaram', copy.funnelChart.paid],
  ['compareceram', copy.funnelChart.attended],
] as const

export function funnelChart(data: ConversionFunnelDataPoint[]): ChartContent {
  const totals = funnelSteps.map(([key]) => data.reduce((sum, item) => sum + item[key], 0))
  const applications = totals[0] ?? 0

  return chart(
    'funnel',
    {
      title: events.funnel.title,
      summary: events.funnel.description,
      chartType: 'horizontalBar',
      unit: 'none',
      series: [copy.retentionChart.people],
    },
    data.length === 0
      ? []
      : funnelSteps.map(([, label], index) => ({
          label: withShare(label, totals[index] ?? 0, applications),
          values: [totals[index] ?? 0],
        })),
  )
}

export function conversionChart(data: ConversionFunnelDataPoint[]): ChartContent {
  return chart(
    'conversion',
    {
      title: events.conversion.title,
      summary: events.conversion.description,
      chartType: 'line',
      unit: 'percent',
      series: [copy.funnelChart.finalised, copy.funnelChart.paid, copy.funnelChart.attended],
    },
    data.map((item) => ({
      label: eventLabel(item),
      values: [item.pct_finalizados, item.pct_pagaram, item.pct_compareceram],
    })),
  )
}

const profileSplit = (
  _key: string,
  text: { title: string; description: string },
  part: [string, number],
  rest: string,
  total: number,
): ChartContent => {
  const [label, value] = part
  const others = Math.max(total - value, 0)

  return chart(
    _key,
    {
      title: text.title,
      summary: text.description,
      chartType: 'proportion',
      unit: 'none',
      series: [copy.kpiScores.community.profiles],
    },
    [
      { label: withShare(label, value, total), values: [value] },
      { label: withShare(rest, others, total), values: [others] },
    ],
  )
}

export function veteranShareChart(data: KpiScores): ChartContent {
  const community = copy.kpiScores.community
  return profileSplit(
    'veteran-share',
    community.veteranShare,
    [community.veterans, data.total_veterans],
    community.rookies,
    data.total_profiles,
  )
}

export function approvalChart(data: KpiScores): ChartContent {
  const community = copy.kpiScores.community
  return profileSplit(
    'approval',
    community.approval,
    [community.approved, data.total_approved],
    community.notApproved,
    data.total_profiles,
  )
}

function averageOccupancy(data: OccupancyDataPoint[]): number {
  const totalAttendees = data.reduce((acc, point) => acc + point.compareceram, 0)
  const totalSpots = data.reduce((acc, point) => acc + point.total_spots, 0)
  if (totalSpots === 0) return 0
  return Math.round((totalAttendees / totalSpots) * 100)
}

export function occupancyChart(data: OccupancyDataPoint[]): ChartContent {
  return chart(
    'occupancy',
    {
      title: events.occupancy.title,
      summary: withNote(
        events.occupancy.description,
        copy.occupancyChart.average(averageOccupancy(data)),
      ),
      chartType: 'line',
      unit: 'percent',
      series: [copy.occupancyChart.occupancy],
    },
    data.map((item) => ({ label: eventLabel(item), values: [item.occupancy_pct] })),
  )
}

export function veteranRookieChart(data: VeteranRookieDataPoint[]): ChartContent {
  return chart(
    'veteran-rookie',
    {
      title: events.veteranRookie.title,
      summary: events.veteranRookie.description,
      chartType: 'bar',
      unit: 'none',
      series: [copy.veteranRookieChart.veterans, copy.veteranRookieChart.rookies],
    },
    data.map((item) => ({ label: eventLabel(item), values: [item.veterans, item.rookies] })),
  )
}

export function seasonalityChart(data: SeasonalityDataPoint[]): ChartContent {
  return chart(
    'seasonality',
    {
      title: events.seasonality.title,
      summary: events.seasonality.description,
      chartType: 'bar',
      unit: 'none',
      series: [copy.seasonalityChart.applications, copy.seasonalityChart.attended],
    },
    data.map((item) => ({
      label: item.month_name,
      values: [item.avg_inscritos, item.avg_compareceram],
    })),
  )
}
