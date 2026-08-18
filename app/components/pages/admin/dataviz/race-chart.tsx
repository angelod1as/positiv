import { useMemo } from 'react'
import type { DemographicDistribution } from '~/business/admin/dataviz/dataviz.types'
import { DemographicFilterToggle } from '~/components/atoms/charts/demographic-filter-toggle'
import type { FilterMode } from '~/components/atoms/charts/demographic-filter-toggle'
import { DonutChart } from '~/components/molecules/charts/donut-chart'
import type { ChartConfig } from '~/components/ui/chart'
import { adminDatavizCopy } from '~/copy/admin/dataviz'
import { groupSmallCategories, sanitizeCssKey } from '~/lib/helpers/chart-utils'

const raceCopy = adminDatavizCopy.raceChart

interface RaceChartProps {
  data: DemographicDistribution[]
  className?: string
  mode: FilterMode
  onModeChange: (mode: FilterMode) => void
}

export function RaceChart({ data, className, mode, onModeChange }: RaceChartProps) {
  if (data.length === 0) {
    return (
      <div className={className} data-chart role="img" aria-label={raceCopy.ariaLabel}>
        <p className="text-center text-muted-foreground">{adminDatavizCopy.noData}</p>
      </div>
    )
  }

  const { processedData, totalCount } = useMemo(() => {
    const grouped = groupSmallCategories(data)
    const total = data.reduce((sum, item) => sum + item.count, 0)
    return { processedData: grouped, totalCount: total }
  }, [data])

  const chartConfig: ChartConfig = useMemo(
    () =>
      processedData.reduce(
        (acc, item, index) => ({
          ...acc,
          [sanitizeCssKey(item.category)]: {
            label: item.category,
            color: `var(--chart-${index + 1})`,
          },
        }),
        {} as ChartConfig,
      ),
    [processedData],
  )

  const chartData = useMemo(
    () =>
      processedData.map((item) => ({
        category: sanitizeCssKey(item.category),
        label: item.category,
        value: item.count,
        count: item.count,
        percentage: item.percentage,
      })),
    [processedData],
  )

  return (
    <div className={className}>
      <DemographicFilterToggle mode={mode} onModeChange={onModeChange} />
      <div data-chart role="img" aria-label={raceCopy.ariaLabel}>
        <DonutChart
          data={chartData}
          config={chartConfig}
          dataKey="value"
          nameKey="category"
          innerRadius={80}
          outerRadius={130}
          ariaLabel={raceCopy.ariaLabel}
          showLabel
          centerLabel={
            <div className="text-center">
              <div className="text-3xl font-bold">{totalCount}</div>
              <div className="text-sm text-muted-foreground">
                {adminDatavizCopy.people}
              </div>
            </div>
          }
          className="h-[400px]"
        />
      </div>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        {raceCopy.filledProfiles(totalCount)}
      </p>
    </div>
  )
}
