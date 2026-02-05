import type {
  DemographicsDataResult,
  GrowthDataPoint,
  RetentionDataPoint,
} from '~/business/admin/dataviz/dataviz.types'
import { ChartSection } from '~/components/atoms/charts/chart-section'
import type { FilterMode } from '~/components/atoms/charts/demographic-filter-toggle'
import { AgeChart } from './age-chart'
import { GenderChart } from './gender-chart'
import { GrowthChart } from './growth-chart'
import { OrientationChart } from './orientation-chart'
import { RaceChart } from './race-chart'
import { RetentionChart } from './retention-chart'

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
      <h2 className="text-2xl font-semibold">Comunidade</h2>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <ChartSection
          title="Identidade de Gênero"
          description="Distribuição de identidades de gênero na comunidade."
        >
          <GenderChart
            data={demographics.gender}
            mode={demographicsMode}
            onModeChange={onModeChange}
          />
        </ChartSection>
        <ChartSection
          title="Orientação Sexual"
          description="Distribuição de orientações sexuais na comunidade."
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
          title="Faixa Etária"
          description="Distribuição de idades na comunidade."
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
          title="Raça/Cor"
          description="Distribuição de raça e cor na comunidade."
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
          title="Crescimento"
          description="Novos cadastros por mês e total acumulado de perfis."
        >
          <GrowthChart data={growth} />
        </ChartSection>
        <ChartSection
          title="Retenção"
          description="Quantas pessoas participaram de N ou mais eventos."
        >
          <RetentionChart data={retention} />
        </ChartSection>
      </div>
    </section>
  )
}
