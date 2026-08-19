import type {
  DemographicsDataResult,
  GrowthDataPoint,
  RetentionDataPoint,
} from '~/business/admin/dataviz/dataviz.types'
import { ChartSection } from '~/components/atoms/charts/chart-section'
import type { FilterMode } from '~/components/atoms/charts/demographic-filter-toggle'
import { adminDatavizCopy } from '~/copy/admin/dataviz'
import { AgeChart } from './age-chart'
import { GenderChart } from './gender-chart'
import { GrowthChart } from './growth-chart'
import { OrientationChart } from './orientation-chart'
import { RaceChart } from './race-chart'
import { RetentionChart } from './retention-chart'

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
  return (
    <section className="space-y-8">
      <h2 className="text-2xl font-semibold">{communityCopy.title}</h2>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <ChartSection
          title={communityCopy.gender.title}
          description={communityCopy.gender.description}
        >
          <GenderChart
            data={demographics.gender}
            mode={demographicsMode}
            onModeChange={onModeChange}
          />
        </ChartSection>
        <ChartSection
          title={communityCopy.orientation.title}
          description={communityCopy.orientation.description}
        >
          <OrientationChart
            data={demographics.orientation}
            mode={demographicsMode}
            onModeChange={onModeChange}
          />
        </ChartSection>
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <ChartSection
          title={communityCopy.age.title}
          description={communityCopy.age.description}
        >
          <AgeChart
            data={demographics.age}
            mode={demographicsMode}
            onModeChange={onModeChange}
            totalProfiles={totalProfiles}
            filledProfiles={filledProfilesAge}
          />
        </ChartSection>
        <ChartSection
          title={communityCopy.race.title}
          description={communityCopy.race.description}
        >
          <RaceChart
            data={demographics.race}
            mode={demographicsMode}
            onModeChange={onModeChange}
          />
        </ChartSection>
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <ChartSection
          title={communityCopy.growth.title}
          description={communityCopy.growth.description}
        >
          <GrowthChart data={growth} />
        </ChartSection>
        <ChartSection
          title={communityCopy.retention.title}
          description={communityCopy.retention.description}
        >
          <RetentionChart data={retention} />
        </ChartSection>
      </div>
    </section>
  )
}
