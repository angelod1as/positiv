import {
  CartesianGrid,
  LabelList,
  Line,
  LineChart as RechartsLineChart,
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
import type { LineChartProps } from '~/types/chart.types'

export function LineChart({
  data,
  config,
  series,
  xAxisKey,
  xAxisFormatter,
  xAxisTickComponent,
  xAxisHeight,
  curved = true,
  className,
  ariaLabel,
  showTooltip = true,
  showLegend = true,
  showValues = false,
  tooltipAnimated = false,
  tooltipContent,
  children,
}: LineChartProps) {
  return (
    <ChartContainer config={config} className={className} role="img" aria-label={ariaLabel}>
      <RechartsLineChart data={data}>
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
          <Line
            key={s.dataKey}
            dataKey={s.dataKey}
            type={curved ? 'monotone' : 'linear'}
            stroke={s.color ?? `var(--color-${s.dataKey})`}
            strokeWidth={2}
            dot={showValues ? { r: 3 } : false}
          >
            {showValues && (
              <LabelList
                dataKey={s.dataKey}
                position="top"
                offset={10}
                className="fill-foreground text-xs"
              />
            )}
          </Line>
        ))}
        {children}
      </RechartsLineChart>
    </ChartContainer>
  )
}
