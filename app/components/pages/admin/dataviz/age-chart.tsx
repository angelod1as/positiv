import { useMemo } from 'react'
import type { DemographicDistribution } from '~/business/admin/dataviz/dataviz.types'
import { DemographicFilterToggle } from '~/components/atoms/charts/demographic-filter-toggle'
import type { FilterMode } from '~/components/atoms/charts/demographic-filter-toggle'
import { BarChart } from '~/components/molecules/charts/bar-chart'
import type { ChartConfig } from '~/components/ui/chart'
import { sortByAgeRange } from '~/lib/helpers/chart-utils'

interface AgeChartProps {
  data: DemographicDistribution[]
  className?: string
  mode: FilterMode
  onModeChange: (mode: FilterMode) => void
  totalProfiles: number
  filledProfiles: number
}

export function AgeChart({
  data,
  className,
  mode,
  onModeChange,
  totalProfiles,
  filledProfiles,
}: AgeChartProps) {
  if (data.length === 0) {
    return (
      <div className={className} data-chart role="img" aria-label="Distribuição de idade">
        <p className="text-center text-muted-foreground">Nenhum dado disponível</p>
      </div>
    )
  }

  const sortedData = useMemo(() => sortByAgeRange(data), [data])

  const chartConfig: ChartConfig = useMemo(
    () =>
      sortedData.reduce(
        (acc, item, index) => ({
          ...acc,
          [item.category]: {
            label: item.category,
            color: `var(--chart-${index + 1})`,
          },
        }),
        {} as ChartConfig,
      ),
    [sortedData],
  )

  const chartData = useMemo(
    () =>
      sortedData.map((item) => ({
        ageRange: item.category,
        count: item.count,
        percentage: item.percentage,
      })),
    [sortedData],
  )

  return (
    <div className={className}>
      <DemographicFilterToggle mode={mode} onModeChange={onModeChange} />
      <p className="mb-4 text-center text-sm text-muted-foreground">
        {filledProfiles} perfis com data de nascimento preenchida (de {totalProfiles} total)
      </p>
      <div data-chart role="img" aria-label="Distribuição de idade">
        <BarChart
          data={chartData}
          config={chartConfig}
          series={[{ dataKey: 'count' }]}
          xAxisKey="ageRange"
          horizontal={true}
          ariaLabel="Distribuição de idade"
          showValues
          className="h-[400px]"
        />
      </div>
    </div>
  )
}
