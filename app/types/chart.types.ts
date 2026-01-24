import type { ChartConfig } from '~/components/ui/chart'
import type { ReactElement, ReactNode } from 'react'

export type { ChartConfig }

export type ChartDataPoint = Record<string, string | number>

export interface ChartSeries {
  dataKey: string
  color?: string
  stackId?: string
}

export interface BaseChartProps {
  data: ChartDataPoint[]
  config: ChartConfig
  className?: string
  ariaLabel?: string
  showTooltip?: boolean
  showLegend?: boolean
  tooltipContent?: ReactElement
  children?: ReactNode
}

export interface LineChartProps extends BaseChartProps {
  series: ChartSeries[]
  xAxisKey: string
  xAxisFormatter?: (value: string) => string
  curved?: boolean
}

export interface BarChartProps extends BaseChartProps {
  series: ChartSeries[]
  xAxisKey: string
  xAxisFormatter?: (value: string) => string
  horizontal?: boolean
  stacked?: boolean
}

export interface DonutChartProps extends BaseChartProps {
  dataKey: string
  nameKey: string
  innerRadius?: number
  outerRadius?: number
  centerLabel?: ReactNode
}

export interface AreaChartProps extends BaseChartProps {
  series: ChartSeries[]
  xAxisKey: string
  xAxisFormatter?: (value: string) => string
  stacked?: boolean
}
