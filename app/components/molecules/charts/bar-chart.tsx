import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  LabelList,
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
  xAxisTickComponent,
  xAxisHeight,
  horizontal = false,
  stacked = false,
  className,
  ariaLabel,
  showTooltip = true,
  showLegend = true,
  showValues = false,
  tooltipAnimated = false,
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
              tickFormatter={xAxisTickComponent ? undefined : xAxisFormatter}
              tick={xAxisTickComponent}
              height={xAxisHeight}
            />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} />
          </>
        )}
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
          <Bar
            key={s.dataKey}
            dataKey={s.dataKey}
            fill={s.color ?? `var(--color-${s.dataKey})`}
            radius={4}
            stackId={stacked ? 'stack' : s.stackId}
          >
            {showValues && (
              <LabelList
                dataKey={s.dataKey}
                position={horizontal ? 'right' : 'top'}
                className="fill-foreground text-xs"
              />
            )}
          </Bar>
        ))}
        {children}
      </RechartsBarChart>
    </ChartContainer>
  )
}
