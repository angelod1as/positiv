import { useState } from 'react'
import type { DemographicDistribution } from '~/business/admin/dataviz/dataviz.types'
import { DonutChart } from '~/components/molecules/charts/donut-chart'
import type { ChartConfig } from '~/components/ui/chart'

interface GenderChartProps {
  data: DemographicDistribution[]
  className?: string
}

type FilterMode = 'all' | 'attended'

export function GenderChart({ data, className }: GenderChartProps) {
  const [mode, setMode] = useState<FilterMode>('all')

  // Handle empty data
  if (data.length === 0) {
    return (
      <div className={className} data-chart role="img" aria-label="Distribuição de gênero">
        <p className="text-center text-muted-foreground">Nenhum dado disponível</p>
      </div>
    )
  }

  // Process data: group categories < 2% into "Outros"
  const processedData = processGenderData(data)

  // Calculate total count for center label
  const totalCount = data.reduce((sum, item) => sum + item.count, 0)

  // Create chart config with colors
  const chartConfig: ChartConfig = processedData.reduce(
    (acc, item, index) => ({
      ...acc,
      [item.category]: {
        label: item.category,
        color: `var(--chart-${index + 1})`,
      },
    }),
    {} as ChartConfig
  )

  // Transform data for DonutChart (needs value field)
  const chartData = processedData.map((item) => ({
    category: item.category,
    value: item.count,
    count: item.count,
    percentage: item.percentage,
  }))

  return (
    <div className={className}>
      {/* Filter toggle */}
      <div className="mb-4 flex justify-center gap-2">
        <button
          type="button"
          onClick={() => setMode('all')}
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
          onClick={() => setMode('attended')}
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

      {/* Chart */}
      <DonutChart
        data={chartData}
        config={chartConfig}
        dataKey="value"
        nameKey="category"
        ariaLabel="Distribuição de gênero"
        centerLabel={
          <div className="text-center">
            <div className="text-3xl font-bold">{totalCount}</div>
            <div className="text-sm text-muted-foreground">pessoas</div>
          </div>
        }
        className="h-[400px]"
      />
    </div>
  )
}

/**
 * Process gender data by grouping categories with < 2% into "Outros"
 */
function processGenderData(
  data: DemographicDistribution[]
): DemographicDistribution[] {
  const mainCategories: DemographicDistribution[] = []
  const smallCategories: DemographicDistribution[] = []

  // Separate categories by percentage threshold
  for (const item of data) {
    if (item.percentage < 2) {
      smallCategories.push(item)
    } else {
      mainCategories.push(item)
    }
  }

  // If there are small categories, combine them into "Outros"
  if (smallCategories.length > 0) {
    const outrosCount = smallCategories.reduce((sum, item) => sum + item.count, 0)
    const total = data.reduce((sum, item) => sum + item.count, 0)
    const outrosPercentage = total > 0 ? Math.round((outrosCount / total) * 100) : 0

    mainCategories.push({
      category: 'Outros',
      count: outrosCount,
      percentage: outrosPercentage,
    })
  }

  return mainCategories
}
