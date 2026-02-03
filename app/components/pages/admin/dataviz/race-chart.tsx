import { useMemo } from 'react'
import type { DemographicDistribution } from '~/business/admin/dataviz/dataviz.types'
import { DonutChart } from '~/components/molecules/charts/donut-chart'
import type { ChartConfig } from '~/components/ui/chart'

export type FilterMode = 'all' | 'attended'

interface RaceChartProps {
  data: DemographicDistribution[]
  className?: string
  mode: FilterMode
  onModeChange: (mode: FilterMode) => void
}

/**
 * Displays race/color distribution as a donut chart with filter toggle.
 * Categories with < 2% representation are grouped into "Outros".
 *
 * Controlled component: accepts mode and onModeChange callback.
 * Parent component should fetch appropriate data based on selected mode.
 *
 * Note: Only ~20% of profiles have filled the race_color field,
 * so a coverage annotation is displayed.
 */
export function RaceChart({ data, className, mode, onModeChange }: RaceChartProps) {

  // Handle empty data
  if (data.length === 0) {
    return (
      <div className={className} data-chart role="img" aria-label="Distribuição de raça/cor">
        <p className="text-center text-muted-foreground">Nenhum dado disponível</p>
      </div>
    )
  }

  // Process data: group categories < 2% into "Outros" and calculate total
  const { processedData, totalCount } = useMemo(() => processRaceData(data), [data])

  // Create chart config with colors
  const chartConfig: ChartConfig = useMemo(
    () =>
      processedData.reduce(
        (acc, item, index) => ({
          ...acc,
          [item.category]: {
            label: item.category,
            color: `var(--chart-${index + 1})`,
          },
        }),
        {} as ChartConfig
      ),
    [processedData]
  )

  // Transform data for DonutChart (needs value field)
  const chartData = useMemo(
    () =>
      processedData.map((item) => ({
        category: item.category,
        value: item.count,
        count: item.count,
        percentage: item.percentage,
      })),
    [processedData]
  )

  return (
    <div className={className}>
      {/* Filter toggle */}
      <div className="mb-4 flex justify-center gap-2">
        <button
          type="button"
          onClick={() => onModeChange('all')}
          data-active={mode === 'all'}
          aria-pressed={mode === 'all'}
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
          aria-pressed={mode === 'attended'}
          className={`rounded px-4 py-2 text-sm transition-colors ${
            mode === 'attended'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          Quem já compareceu
        </button>
      </div>

      {/* Chart */}
      <div data-chart role="img" aria-label="Distribuição de raça/cor">
        <DonutChart
          data={chartData}
          config={chartConfig}
          dataKey="value"
          nameKey="category"
          ariaLabel="Distribuição de raça/cor"
          centerLabel={
            <div className="text-center">
              <div className="text-3xl font-bold">{totalCount}</div>
              <div className="text-sm text-muted-foreground">pessoas</div>
            </div>
          }
          className="h-[400px]"
        />
      </div>

      {/* Low coverage annotation */}
      <p className="mt-4 text-center text-sm text-muted-foreground">
        Apenas {totalCount} perfis preencheram este campo
      </p>
    </div>
  )
}

/**
 * Process race data by grouping categories with < 2% into "Outros"
 * Returns both processed data and total count
 */
function processRaceData(data: DemographicDistribution[]): {
  processedData: DemographicDistribution[]
  totalCount: number
} {
  const mainCategories: DemographicDistribution[] = []
  let outrosCount = 0
  const totalCount = data.reduce((sum, item) => sum + item.count, 0)

  // Separate categories by percentage threshold
  for (const item of data) {
    if (item.percentage < 2) {
      outrosCount += item.count
    } else {
      mainCategories.push(item)
    }
  }

  // If there are small categories, combine them into "Outros"
  if (outrosCount > 0) {
    const outrosPercentage = totalCount > 0 ? Math.round((outrosCount / totalCount) * 100) : 0

    mainCategories.push({
      category: 'Outros',
      count: outrosCount,
      percentage: outrosPercentage,
    })
  }

  return { processedData: mainCategories, totalCount }
}
