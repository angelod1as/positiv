import type { PieLabelRenderProps } from 'recharts'
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

function renderCustomLabel(props: PieLabelRenderProps) {
  const { cx, cy, midAngle = 0, outerRadius: or, payload } = props
  const RADIAN = Math.PI / 180
  const radius = (or as number) + 20
  const x = (cx as number) + radius * Math.cos(-midAngle * RADIAN)
  const y = (cy as number) + radius * Math.sin(-midAngle * RADIAN)
  const textAnchor = x > (cx as number) ? 'start' : 'end'

  const data = payload as Record<string, unknown>
  const label = (data.label ?? data.category ?? '') as string
  const percentage = data.percentage as number | undefined

  return (
    <text
      x={x}
      y={y}
      textAnchor={textAnchor}
      dominantBaseline="central"
      className="fill-foreground text-xs"
    >
      {label} {percentage != null && `(${percentage}%)`}
    </text>
  )
}

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
  tooltipAnimated = false,
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
          label={showLabel ? renderCustomLabel : false}
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
            isAnimationActive={tooltipAnimated}
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
