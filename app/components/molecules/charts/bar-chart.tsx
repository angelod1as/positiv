import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts'

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '~/components/ui/chart'
import type { BarChartProps } from '~/types/chart.types'

export function BarChart({
  data,
  config,
  series,
  xAxisKey,
  xAxisFormatter,
  horizontal = false,
  stacked = false,
  className,
  ariaLabel,
  showTooltip = true,
  showLegend = true,
  tooltipContent,
  children,
}: BarChartProps) {
  return (
    <ChartContainer config={config} className={className} role="img" aria-label={ariaLabel}>
      <RechartsBarChart
        data={data}
        layout={horizontal ? 'vertical' : 'horizontal'}
      >
        <CartesianGrid vertical={false} />
        {horizontal ? (
          <>
            <YAxis
              dataKey={xAxisKey}
              type="category"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={xAxisFormatter}
            />
            <XAxis type="number" tickLine={false} axisLine={false} />
          </>
        ) : (
          <>
            <XAxis
              dataKey={xAxisKey}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={xAxisFormatter}
            />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} />
          </>
        )}
        {showTooltip && (
          <ChartTooltip
            content={tooltipContent ?? <ChartTooltipContent />}
          />
        )}
        {showLegend && (
          <ChartLegend content={<ChartLegendContent />} />
        )}
        {series.map((s) => (
          <Bar
            key={s.dataKey}
            dataKey={s.dataKey}
            fill={`var(--color-${s.dataKey})`}
            radius={4}
            stackId={stacked ? 'stack' : s.stackId}
          />
        ))}
        {children}
      </RechartsBarChart>
    </ChartContainer>
  )
}
