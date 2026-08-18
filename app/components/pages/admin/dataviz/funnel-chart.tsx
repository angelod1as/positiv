import { useMemo } from 'react'
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  LabelList,
  XAxis,
  YAxis,
} from 'recharts'
import type { ConversionFunnelDataPoint } from '~/business/admin/dataviz/dataviz.types'
import { MultiLineXAxisTick } from '~/components/atoms/charts/multi-line-x-axis-tick'
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from '~/components/ui/chart'
import { buildEventLabel } from '~/lib/helpers/chart-utils'

interface FunnelChartProps {
  data: ConversionFunnelDataPoint[]
  className?: string
}

interface TooltipPayloadItem {
  dataKey?: string
  value?: number
  color?: string
  stroke?: string
  fill?: string
  payload?: ConversionFunnelDataPoint & { label: string }
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: string
}

function CustomTooltipContent({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null

  const [firstLine, secondLine] = (label || '').split('\n')
  const dataPoint = payload[0]?.payload

  if (!dataPoint) return null

  return (
    <div className="chart-tooltip" role="tooltip" aria-live="polite">
      <div className="mb-2 font-medium">
        <div>{firstLine}</div>
        {secondLine && <div className="text-muted-foreground">{secondLine}</div>}
      </div>
      <div className="grid gap-1.5">
        <div className="chart-tooltip-row">
          <span className="chart-tooltip-swatch" style={{ backgroundColor: 'var(--chart-1)' }} />
          <span className="chart-tooltip-label">Candidaturas</span>
          <span className="chart-tooltip-value">{dataPoint.inscritos}</span>
        </div>
        <div className="chart-tooltip-row">
          <span className="chart-tooltip-swatch" style={{ backgroundColor: 'var(--chart-2)' }} />
          <span className="chart-tooltip-label">Finalizados</span>
          <span className="chart-tooltip-value">
            {dataPoint.finalizados} ({dataPoint.pct_finalizados}% das candidaturas)
          </span>
        </div>
        <div className="chart-tooltip-row">
          <span className="chart-tooltip-swatch" style={{ backgroundColor: 'var(--chart-3)' }} />
          <span className="chart-tooltip-label">Pagaram</span>
          <span className="chart-tooltip-value">
            {dataPoint.pagaram} ({dataPoint.pct_pagaram}% das candidaturas)
          </span>
        </div>
        <div className="chart-tooltip-row">
          <span className="chart-tooltip-swatch" style={{ backgroundColor: 'var(--chart-4)' }} />
          <span className="chart-tooltip-label">Compareceram</span>
          <span className="chart-tooltip-value">
            {dataPoint.compareceram} ({dataPoint.pct_compareceram}% das candidaturas)
          </span>
        </div>
      </div>
    </div>
  )
}

const SERIES_CONFIG = [
  {
    dataKey: 'compareceram',
    segmentKey: 'compareceram_segment',
    label: 'Compareceram',
    color: 'var(--chart-4)',
  },
  {
    dataKey: 'pagaram',
    segmentKey: 'pagaram_segment',
    label: 'Pagaram',
    color: 'var(--chart-3)',
  },
  {
    dataKey: 'finalizados',
    segmentKey: 'finalizados_segment',
    label: 'Finalizados',
    color: 'var(--chart-2)',
  },
  {
    dataKey: 'inscritos',
    segmentKey: 'inscritos_segment',
    label: 'Candidaturas',
    color: 'var(--chart-1)',
  },
] as const

export function FunnelChart({ data, className }: FunnelChartProps) {
  const chartConfig: ChartConfig = {
    compareceram: { label: 'Compareceram', color: 'var(--chart-4)' },
    pagaram: { label: 'Pagaram', color: 'var(--chart-3)' },
    finalizados: { label: 'Finalizados', color: 'var(--chart-2)' },
    inscritos: { label: 'Candidaturas', color: 'var(--chart-1)' },
  }

  const chartData = useMemo(
    () =>
      data.map((item) => ({
        ...item,
        label: buildEventLabel(item),
        inscritos_segment: item.inscritos - item.finalizados,
        finalizados_segment: item.finalizados - item.pagaram,
        pagaram_segment: item.pagaram - item.compareceram,
        compareceram_segment: item.compareceram,
      })),
    [data]
  )

  return (
    <ChartContainer
      config={chartConfig}
      className={className}
      role="img"
      aria-label="Funil de conversão por evento"
    >
      <RechartsBarChart data={chartData}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          height={50}
          tick={MultiLineXAxisTick}
        />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} />
        <ChartTooltip content={<CustomTooltipContent />} isAnimationActive={false} />
        {SERIES_CONFIG.map((series) => (
          <Bar
            key={series.dataKey}
            dataKey={series.segmentKey}
            stackId="funnel"
            fill={series.color}
            radius={4}
          >
            {series.dataKey === 'inscritos' && (
              <LabelList
                dataKey="inscritos"
                position="top"
                className="fill-foreground text-xs"
              />
            )}
          </Bar>
        ))}
      </RechartsBarChart>
    </ChartContainer>
  )
}
