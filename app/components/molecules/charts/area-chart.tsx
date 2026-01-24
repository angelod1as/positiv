import {
  Area,
  AreaChart as RechartsAreaChart,
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
import type { AreaChartProps } from '~/types/chart.types'

export function AreaChart({
  data,
  config,
  series,
  xAxisKey,
  xAxisFormatter,
  stacked = true,
  className,
  showTooltip = true,
  showLegend = true,
  tooltipContent,
  children,
}: AreaChartProps) {
  return (
    <ChartContainer config={config} className={className}>
      <RechartsAreaChart data={data}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey={xAxisKey}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={xAxisFormatter}
        />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} />
        {showTooltip && (
          <ChartTooltip
            content={tooltipContent ?? <ChartTooltipContent />}
          />
        )}
        {showLegend && (
          <ChartLegend content={<ChartLegendContent />} />
        )}
        {series.map((s) => (
          <Area
            key={s.dataKey}
            dataKey={s.dataKey}
            type="monotone"
            fill={`var(--color-${s.dataKey})`}
            fillOpacity={0.4}
            stroke={`var(--color-${s.dataKey})`}
            stackId={stacked ? 'stack' : s.stackId}
          />
        ))}
        {children}
      </RechartsAreaChart>
    </ChartContainer>
  )
}
