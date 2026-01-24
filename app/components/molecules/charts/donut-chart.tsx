import { Cell, Pie, PieChart } from 'recharts'

import { cn } from '~/lib/utils'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '~/components/ui/chart'
import type { DonutChartProps } from '~/types/chart.types'

export function DonutChart({
  data,
  config,
  dataKey,
  nameKey,
  innerRadius = 60,
  outerRadius = 80,
  centerLabel,
  showLabel = false,
  className,
  ariaLabel,
  showTooltip = true,
  showLegend = true,
  tooltipContent,
  children,
}: DonutChartProps) {
  return (
    <ChartContainer config={config} className={cn('relative', className)} role="img" aria-label={ariaLabel}>
      <PieChart>
        <Pie
          data={data}
          dataKey={dataKey}
          nameKey={nameKey}
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          strokeWidth={2}
          label={showLabel}
        >
          {data.map((entry) => {
            const name = String(entry[nameKey])
            return (
              <Cell
                key={name}
                fill={`var(--color-${name})`}
              />
            )
          })}
        </Pie>
        {showTooltip && (
          <ChartTooltip
            content={tooltipContent ?? <ChartTooltipContent nameKey={nameKey} />}
          />
        )}
        {showLegend && (
          <ChartLegend content={<ChartLegendContent nameKey={nameKey} />} />
        )}
        {children}
      </PieChart>
      {centerLabel && (
        <div
          data-slot="center-label"
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          {centerLabel}
        </div>
      )}
    </ChartContainer>
  )
}
