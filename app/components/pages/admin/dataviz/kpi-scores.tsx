import type { KpiScores as KpiScoresData } from '~/business/admin/dataviz/dataviz.types'
import type { PageSection } from '~/business/cms/page.schema'
import { StatsSection } from '~/components/pages/page/sections/stats-section'
import { adminDatavizCopy } from '~/copy/admin/dataviz'

const kpiCopy = adminDatavizCopy.kpiScores

type StatsContent = Extract<PageSection, { _type: 'statsSection' }>
type StatNumber = Extract<StatsContent['cards'][number], { _type: 'statNumber' }>

type KpiScoresProps = {
  data: KpiScoresData
}

function calculatePercentage(value: number, total: number): string {
  if (total === 0) return '0%'
  return `${Math.round((value / total) * 100)}%`
}

const stat = (
  _key: string,
  value: number,
  caption: string,
  unit: StatNumber['unit'] = 'none',
): StatNumber => ({ _type: 'statNumber', _key, value, caption, unit })

const group = (_key: string, title: string, cards: StatNumber[]): StatsContent => ({
  _type: 'statsSection',
  _key,
  title,
  cards,
})

export function KpiScores({ data }: KpiScoresProps) {
  const veteranPercentage = calculatePercentage(data.total_veterans, data.total_profiles)
  const approvedPercentage = calculatePercentage(data.total_approved, data.total_profiles)

  const groups = [
    group('community', kpiCopy.community.title, [
      stat('profiles', data.total_profiles, kpiCopy.community.totalProfiles),
      stat(
        'veterans',
        data.total_veterans,
        kpiCopy.withNote(kpiCopy.community.veterans, veteranPercentage),
      ),
      stat(
        'approved',
        data.total_approved,
        kpiCopy.withNote(kpiCopy.community.approved, approvedPercentage),
      ),
    ]),
    group('engagement', kpiCopy.engagement.title, [
      stat('attendees', data.total_unique_attendees, kpiCopy.engagement.uniqueAttendees),
      stat(
        'average-attendance',
        data.avg_attendance_per_event,
        kpiCopy.withNote(
          kpiCopy.engagement.averageAttendance,
          kpiCopy.engagement.averageAttendanceDescription,
        ),
      ),
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
      {groups.map((content) => (
        <StatsSection key={content._key} content={content} />
      ))}
    </div>
  )
}
