import { useMemo } from 'react'
import type { DemographicDistribution } from '~/business/admin/dataviz/dataviz.types'
import { DemographicFilterToggle } from '~/components/atoms/charts/demographic-filter-toggle'
import type { FilterMode } from '~/components/atoms/charts/demographic-filter-toggle'
import { BarChart } from '~/components/molecules/charts/bar-chart'
import type { ChartConfig } from '~/components/ui/chart'
import { adminDatavizCopy } from '~/copy/admin/dataviz'
import { sortByAgeRange } from '~/lib/helpers/chart-utils'

const ageCopy = adminDatavizCopy.ageChart

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
      <div className={className} data-chart role="img" aria-label={ageCopy.ariaLabel}>
        <p className="text-center text-muted-foreground">{adminDatavizCopy.noData}</p>
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
        {ageCopy.filledProfiles(filledProfiles, totalProfiles)}
      </p>
      <div data-chart role="img" aria-label={ageCopy.ariaLabel}>
        <BarChart
          data={chartData}
          config={chartConfig}
          series={[{ dataKey: 'count' }]}
          xAxisKey="ageRange"
          horizontal={true}
          ariaLabel={ageCopy.ariaLabel}
          showValues
          className="h-[400px]"
        />
      </div>
    </div>
  )
}
