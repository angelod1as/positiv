import type {
  DemographicsDataResult,
  GrowthDataPoint,
  KpiScores,
  PartySummary,
  RetentionDataPoint,
  VeteranRookieDataPoint,
} from '~/business/reporting/dataviz/dataviz.types'
import { DemographicFilterToggle } from '~/components/atoms/charts/demographic-filter-toggle'
import type { FilterMode } from '~/components/atoms/charts/demographic-filter-toggle'
import { StatsSection } from '~/components/pages/page/sections/stats-section'
import { adminDatavizCopy } from '~/copy/admin/dataviz'
import { DatavizChart } from './dataviz-chart'
import {
  ageChart,
  demographicChart,
  newcomersChart,
  newProfilesChart,
  retentionChart,
  veteranRookieChart,
} from './dataviz-charts'
import { DatavizHeading } from './dataviz-heading'
import { type StatCard, internalChart, percentOf, stat, statsGroup } from './stat-cards'

const copy = adminDatavizCopy.chapters.people

type PeopleChapterProps = {
  summary: PartySummary
  kpis: KpiScores
  veteranRookie: VeteranRookieDataPoint[]
  retention: RetentionDataPoint[]
  demographics: DemographicsDataResult
  growth: GrowthDataPoint[]
  demographicsMode: FilterMode
  onModeChange: (mode: FilterMode) => void
}

function ageCard(age: PartySummary['age']): StatCard {
  if (!age) return stat('age', 0, copy.age)
  return {
    _type: 'statRange',
    _key: 'age',
    min: age.min,
    average: age.avg,
    max: age.max,
    caption: copy.age,
    unit: 'none',
  }
}

export function PeopleChapter({
  summary,
  kpis,
  veteranRookie,
  retention,
  demographics,
  growth,
  demographicsMode,
  onModeChange,
}: PeopleChapterProps) {
  const report = statsGroup('people', null, [
    stat('returned', percentOf(summary.newcomers_returned, summary.newcomers), copy.returned, 'percent'),
    stat('repeat', summary.repeat_people, copy.repeat),
    ageCard(summary.age),
  ])
  const frequency = statsGroup('frequency', adminDatavizCopy.internal(copy.frequencyTitle), [
    stat('newcomers', summary.newcomers, copy.newcomers),
    stat('three-plus', kpis.attended_3_plus, copy.threePlus),
    stat('five-plus', kpis.attended_5_plus, copy.fivePlus),
  ])
  const filledAge = demographics.age.reduce((sum, item) => sum + item.count, 0)
  const charts = [
    veteranRookieChart(veteranRookie),
    retentionChart(retention),
    ageChart(demographics.age, { filled: filledAge, total: kpis.total_profiles }),
    demographicChart('orientation', demographics.orientation),
  ]
  const internal = [
    demographicChart('gender', demographics.gender),
    demographicChart('race', demographics.race),
    newProfilesChart(growth),
  ].map(internalChart)

  return (
    <div>
      <DatavizHeading title={copy.title}>
        <DemographicFilterToggle mode={demographicsMode} onModeChange={onModeChange} />
      </DatavizHeading>
      <DatavizChart content={newcomersChart(summary)} />
      <StatsSection content={report} />
      {charts.map((content) => (
        <DatavizChart key={content._key} content={content} />
      ))}
      <StatsSection content={frequency} />
      {internal.map((content) => (
        <DatavizChart key={content._key} content={content} />
      ))}
    </div>
  )
}
