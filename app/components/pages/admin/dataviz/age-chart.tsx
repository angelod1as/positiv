import { useMemo } from 'react'
import type { DemographicDistribution } from '~/business/admin/dataviz/dataviz.types'
import { BarChart } from '~/components/molecules/charts/bar-chart'
import type { ChartConfig } from '~/components/ui/chart'

export type FilterMode = 'all' | 'attended'

interface AgeChartProps {
  data: DemographicDistribution[]
  className?: string
  mode: FilterMode
  onModeChange: (mode: FilterMode) => void
  totalProfiles: number
  filledProfiles: number
}

/**
 * Displays age distribution as a horizontal bar chart with filter toggle.
 *
 * Age ranges: 18-24, 25-29, 30-34, 35-39, 40-49, 50+
 *
 * Controlled component: accepts mode and onModeChange callback.
 * Parent component should fetch appropriate data based on selected mode.
 */
export function AgeChart({
  data,
  className,
  mode,
  onModeChange,
  totalProfiles,
  filledProfiles,
}: AgeChartProps) {
  // Handle empty data
  if (data.length === 0) {
    return (
      <div className={className} data-chart role="img" aria-label="Distribuição de idade">
        <p className="text-center text-muted-foreground">Nenhum dado disponível</p>
      </div>
    )
  }

  // Create chart config with colors for each age range
  const chartConfig: ChartConfig = useMemo(
    () =>
      data.reduce(
        (acc, item, index) => ({
          ...acc,
          [item.category]: {
            label: item.category,
            color: `var(--chart-${index + 1})`,
          },
        }),
        {} as ChartConfig
      ),
    [data]
  )

  // Transform data for BarChart (needs specific field structure)
  const chartData = useMemo(
    () =>
      data.map((item) => ({
        ageRange: item.category,
        count: item.count,
        percentage: item.percentage,
      })),
    [data]
  )

  return (
    <div className={className}>
      {/* Filter toggle */}
      <div className="mb-4 flex justify-center gap-2">
        <button
          type="button"
          onClick={() => onModeChange('all')}
          data-active={mode === 'all'}
          className={`rounded px-4 py-2 text-sm transition-colors ${
            mode === 'all'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          Toda a comunidade
        </button>
        <button
          type="button"
          onClick={() => onModeChange('attended')}
          data-active={mode === 'attended'}
          className={`rounded px-4 py-2 text-sm transition-colors ${
            mode === 'attended'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          Quem já compareceu
        </button>
      </div>

      {/* Annotation */}
      <p className="mb-4 text-center text-sm text-muted-foreground">
        {filledProfiles} perfis com data de nascimento preenchida (de {totalProfiles} total)
      </p>

      {/* Chart */}
      <div data-chart role="img" aria-label="Distribuição de idade">
        <BarChart
          data={chartData}
          config={chartConfig}
          series={[{ dataKey: 'count' }]}
          xAxisKey="ageRange"
          horizontal={true}
          ariaLabel="Distribuição de idade"
          className="h-[400px]"
        />
      </div>
    </div>
  )
}
