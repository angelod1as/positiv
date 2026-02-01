import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import type { ConversionFunnelDataPoint } from '~/business/admin/dataviz/dataviz.types'
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from '~/components/ui/chart'

interface FunnelChartProps {
  data: ConversionFunnelDataPoint[]
  className?: string
}

function formatDate(dateString: string): string {
  try {
    const date = parseISO(dateString)
    return format(date, 'dd/MM/yy')
  } catch {
    return dateString
  }
}

interface CustomXAxisTickProps {
  x?: string | number
  y?: string | number
  payload?: { value: string }
}

function CustomXAxisTick({ x, y, payload }: CustomXAxisTickProps) {
  if (!payload?.value) return null

  const [firstLine, secondLine] = payload.value.split('\n')

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={12}
        textAnchor="middle"
        className="fill-muted-foreground text-xs"
      >
        {firstLine}
      </text>
      <text
        x={0}
        y={0}
        dy={26}
        textAnchor="middle"
        className="fill-muted-foreground text-xs"
      >
        {secondLine}
      </text>
    </g>
  )
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
    <div className="border-border/50 bg-background rounded-lg border px-3 py-2 text-xs shadow-xl">
      <div className="mb-2 font-medium">
        <div>{firstLine}</div>
        {secondLine && <div className="text-muted-foreground">{secondLine}</div>}
      </div>
      <div className="grid gap-1.5">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
            style={{ backgroundColor: 'var(--chart-1)' }}
          />
          <span className="text-muted-foreground flex-1">Inscritos</span>
          <span className="font-mono font-medium tabular-nums">
            {dataPoint.inscritos}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
            style={{ backgroundColor: 'var(--chart-2)' }}
          />
          <span className="text-muted-foreground flex-1">Finalizados</span>
          <span className="font-mono font-medium tabular-nums">
            {dataPoint.finalizados} ({dataPoint.pct_finalizados}% dos inscritos)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
            style={{ backgroundColor: 'var(--chart-3)' }}
          />
          <span className="text-muted-foreground flex-1">Pagaram</span>
          <span className="font-mono font-medium tabular-nums">
            {dataPoint.pagaram} ({dataPoint.pct_pagaram}% dos inscritos)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
            style={{ backgroundColor: 'var(--chart-4)' }}
          />
          <span className="text-muted-foreground flex-1">Compareceram</span>
          <span className="font-mono font-medium tabular-nums">
            {dataPoint.compareceram} ({dataPoint.pct_compareceram}% dos inscritos)
          </span>
        </div>
      </div>
    </div>
  )
}

const SERIES_CONFIG = [
  { dataKey: 'inscritos', label: 'Inscritos', color: 'var(--chart-1)' },
  { dataKey: 'finalizados', label: 'Finalizados', color: 'var(--chart-2)' },
  { dataKey: 'pagaram', label: 'Pagaram', color: 'var(--chart-3)' },
  { dataKey: 'compareceram', label: 'Compareceram', color: 'var(--chart-4)' },
] as const

export function FunnelChart({ data, className }: FunnelChartProps) {
  const chartConfig: ChartConfig = {
    inscritos: {
      label: 'Inscritos',
      color: 'var(--chart-1)',
    },
    finalizados: {
      label: 'Finalizados',
      color: 'var(--chart-2)',
    },
    pagaram: {
      label: 'Pagaram',
      color: 'var(--chart-3)',
    },
    compareceram: {
      label: 'Compareceram',
      color: 'var(--chart-4)',
    },
  }

  const chartData = data.map((item) => ({
    ...item,
    label: `${item.emoji} ${item.title}\n${formatDate(item.date)}`,
  }))

  const minWidth = Math.max(600, data.length * 120)

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth }}>
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
              tick={CustomXAxisTick}
            />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip content={<CustomTooltipContent />} />
            {SERIES_CONFIG.map((series) => (
              <Bar
                key={series.dataKey}
                dataKey={series.dataKey}
                stackId="funnel"
                fill={`var(--color-${series.dataKey})`}
                radius={4}
              />
            ))}
          </RechartsBarChart>
        </ChartContainer>
      </div>
    </div>
  )
}
