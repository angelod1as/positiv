import type { ChartConfig } from '~/components/ui/chart'
import type { ComponentType, ReactElement, ReactNode } from 'react'

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
  tooltipAnimated?: boolean
  tooltipContent?: ReactElement | ((props: Record<string, unknown>) => ReactNode)
  children?: ReactNode
}

export interface XAxisCustomProps {
  xAxisTickComponent?: ComponentType<{ x?: string | number; y?: string | number; payload?: { value: string } }>
  xAxisHeight?: number
}

export interface LineChartProps extends BaseChartProps, XAxisCustomProps {
  series: ChartSeries[]
  xAxisKey: string
  xAxisFormatter?: (value: string) => string
  curved?: boolean
}

export interface BarChartProps extends BaseChartProps, XAxisCustomProps {
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
  showLabel?: boolean
}

export interface AreaChartProps extends BaseChartProps, XAxisCustomProps {
  series: ChartSeries[]
  xAxisKey: string
  xAxisFormatter?: (value: string) => string
  stacked?: boolean
}
