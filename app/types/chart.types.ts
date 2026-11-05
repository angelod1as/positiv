import type { ChartConfig } from '~/components/ui/chart'
import type { ReactElement, ReactNode } from 'react'

export type { ChartConfig }

export type ChartDataPoint = Record<string, string | number>

export interface ChartSeries {
  dataKey: string
  color?: string
  stackId?: string
  cellColors?: (string | undefined)[]
}

export interface BaseChartProps {
  data: ChartDataPoint[]
  config: ChartConfig
  className?: string
  ariaLabel?: string
  showTooltip?: boolean
  showLegend?: boolean
  showValues?: boolean
  tooltipAnimated?: boolean
  animated?: boolean
  accessibilityLayer?: boolean
  valueFormatter?: (value: number) => string
  tooltipContent?: ReactElement | ((props: Record<string, unknown>) => ReactNode)
  children?: ReactNode
}

export interface XAxisTickProps {
  x?: string | number
  y?: string | number
  payload?: { value: string }
}

export interface XAxisCustomProps {
  xAxisTickComponent?: (props: XAxisTickProps) => ReactElement | null
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
  categoryAxisWidth?: number
}
