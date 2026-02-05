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
  xAxisTickComponent,
  xAxisHeight,
  stacked = true,
  className,
  ariaLabel,
  showTooltip = true,
  showLegend = true,
  tooltipAnimated = false,
  tooltipContent,
  children,
}: AreaChartProps) {
  return (
    <ChartContainer config={config} className={className} role="img" aria-label={ariaLabel}>
      <RechartsAreaChart data={data}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey={xAxisKey}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={xAxisTickComponent ? undefined : xAxisFormatter}
          tick={xAxisTickComponent}
          height={xAxisHeight}
        />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} />
        {showTooltip && (
          <ChartTooltip
            isAnimationActive={tooltipAnimated}
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
            fill={s.color ?? `var(--color-${s.dataKey})`}
            fillOpacity={0.4}
            stroke={s.color ?? `var(--color-${s.dataKey})`}
            stackId={stacked ? 'stack' : s.stackId}
          />
        ))}
        {children}
      </RechartsAreaChart>
    </ChartContainer>
  )
}
