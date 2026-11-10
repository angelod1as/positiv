import type {
  DemographicsDataResult,
  GrowthDataPoint,
  RetentionDataPoint,
} from '~/business/reporting/dataviz/dataviz.types'
import { DemographicFilterToggle } from '~/components/atoms/charts/demographic-filter-toggle'
import type { FilterMode } from '~/components/atoms/charts/demographic-filter-toggle'
import { adminDatavizCopy } from '~/copy/admin/dataviz'
import { DatavizChart } from './dataviz-chart'
import {
  ageChart,
  cumulativeGrowthChart,
  demographicChart,
  newProfilesChart,
  retentionChart,
} from './dataviz-charts'
import { DatavizHeading } from './dataviz-heading'

const communityCopy = adminDatavizCopy.communitySection

interface CommunitySectionProps {
  demographics: DemographicsDataResult
  growth: GrowthDataPoint[]
  retention: RetentionDataPoint[]
  demographicsMode: FilterMode
  onModeChange: (mode: FilterMode) => void
  totalProfiles: number
  filledProfilesAge: number
}

export function CommunitySection({
  demographics,
  growth,
  retention,
  demographicsMode,
  onModeChange,
  totalProfiles,
  filledProfilesAge,
}: CommunitySectionProps) {
  const charts = [
    demographicChart('gender', demographics.gender),
    demographicChart('orientation', demographics.orientation),
    ageChart(demographics.age, { filled: filledProfilesAge, total: totalProfiles }),
    demographicChart('race', demographics.race),
    newProfilesChart(growth),
    cumulativeGrowthChart(growth),
    retentionChart(retention),
  ]

  return (
    <div>
      <DatavizHeading title={communityCopy.title}>
        <DemographicFilterToggle mode={demographicsMode} onModeChange={onModeChange} />
      </DatavizHeading>
      {charts.map((content) => (
        <DatavizChart key={content._key} content={content} />
      ))}
    </div>
  )
}
