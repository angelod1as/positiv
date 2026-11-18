import type { KpiScores, PartySummary } from '~/business/reporting/dataviz/dataviz.types'
import { StatsSection } from '~/components/pages/page/sections/stats-section'
import { adminDatavizCopy } from '~/copy/admin/dataviz'
import { stat, statsGroup } from './stat-cards'

const copy = adminDatavizCopy.chapters.overview

type OverviewChapterProps = {
  summary: PartySummary
  kpis: KpiScores
}

export function OverviewChapter({ summary, kpis }: OverviewChapterProps) {
  const overview = statsGroup('overview', copy.title, [
    stat('parties', summary.parties, copy.parties),
    stat('people', summary.people, copy.people),
    stat('applications', summary.applications, copy.applications),
  ])
  const register = statsGroup('register', adminDatavizCopy.internal(copy.registerTitle), [
    stat('profiles', kpis.total_profiles, copy.profiles),
    stat('approved', kpis.total_approved, copy.approved),
    stat('flagged', kpis.total_flagged, copy.flagged),
  ])

  return (
    <div>
      <StatsSection content={overview} />
      <StatsSection content={register} />
    </div>
  )
}
