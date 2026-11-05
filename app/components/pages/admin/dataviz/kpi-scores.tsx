import type {
  EventAttendanceDataPoint,
  KpiScores as KpiScoresData,
} from '~/business/admin/dataviz/dataviz.types'
import type { PageSection } from '~/business/cms/page.schema'
import { StatsSection } from '~/components/pages/page/sections/stats-section'
import { adminDatavizCopy } from '~/copy/admin/dataviz'
import { DatavizChart } from './dataviz-chart'
import { approvalChart, veteranShareChart } from './dataviz-charts'

const kpiCopy = adminDatavizCopy.kpiScores

type StatsContent = Extract<PageSection, { _type: 'statsSection' }>
type StatCard = StatsContent['cards'][number]
type StatNumber = Extract<StatCard, { _type: 'statNumber' }>

type KpiScoresProps = {
  data: KpiScoresData
  attendance: Pick<EventAttendanceDataPoint, 'compareceram'>[]
}

const stat = (
  _key: string,
  value: number,
  caption: string,
  unit: StatNumber['unit'] = 'none',
): StatNumber => ({ _type: 'statNumber', _key, value, caption, unit })

const group = (_key: string, title: string, cards: StatCard[]): StatsContent => ({
  _type: 'statsSection',
  _key,
  title,
  cards,
})

function averageAttendance(
  average: number,
  attendance: KpiScoresProps['attendance'],
): StatCard {
  const caption = kpiCopy.withNote(
    kpiCopy.engagement.averageAttendance,
    kpiCopy.engagement.averageAttendanceDescription,
  )
  if (attendance.length === 0) return stat('average-attendance', average, caption)

  const attended = attendance.map((event) => event.compareceram)
  return {
    _type: 'statRange',
    _key: 'average-attendance',
    min: Math.min(...attended),
    average,
    max: Math.max(...attended),
    caption,
    unit: 'none',
  }
}

export function KpiScores({ data, attendance }: KpiScoresProps) {
  const community = group('community', kpiCopy.community.title, [
    stat('profiles', data.total_profiles, kpiCopy.community.totalProfiles),
  ])

  const groups = [
    group('engagement', kpiCopy.engagement.title, [
      stat('attendees', data.total_unique_attendees, kpiCopy.engagement.uniqueAttendees),
      averageAttendance(data.avg_attendance_per_event, attendance),
      stat('three-plus', data.attended_3_plus, kpiCopy.engagement.attendedThreePlus),
      stat('five-plus', data.attended_5_plus, kpiCopy.engagement.attendedFivePlus),
    ]),
    group('revenue', kpiCopy.revenue.title, [
      stat('total', data.total_revenue / 100, kpiCopy.revenue.total, 'brl'),
      stat(
        'per-event',
        data.avg_revenue_per_event / 100,
        kpiCopy.revenue.averagePerEvent,
        'brl',
      ),
    ]),
    group('health', kpiCopy.health.title, [
      stat('no-show', data.avg_no_show_rate, kpiCopy.health.noShowRate, 'percent'),
      stat(
        'flagged',
        data.total_flagged,
        kpiCopy.withNote(kpiCopy.health.flagged, kpiCopy.health.flaggedDescription),
      ),
    ]),
  ]

  return (
    <div>
      <StatsSection content={community} />
      <DatavizChart content={veteranShareChart(data)} />
      <DatavizChart content={approvalChart(data)} />
      {groups.map((content) => (
        <StatsSection key={content._key} content={content} />
      ))}
    </div>
  )
}
