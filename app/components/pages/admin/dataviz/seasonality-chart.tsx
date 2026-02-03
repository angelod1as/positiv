import { useMemo } from 'react'
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts'
import { format, isValid, parseISO } from 'date-fns'
import type { EventAttendanceDataPoint } from '~/business/admin/dataviz/dataviz.types'
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from '~/components/ui/chart'

interface SeasonalityChartProps {
  data: EventAttendanceDataPoint[]
  className?: string
}

function formatDate(dateString: string): string {
  try {
    const date = parseISO(dateString)
    if (!isValid(date)) return dateString
    return format(date, 'dd/MM/yy')
  } catch {
    return dateString
  }
}

function calculateYearsSpan(data: EventAttendanceDataPoint[]): number {
  if (data.length === 0) return 0

  const validDates = data.map((d) => parseISO(d.date)).filter(isValid)
  if (validDates.length === 0) return 0

  const earliest = new Date(Math.min(...validDates.map((d) => d.getTime())))
  const latest = new Date(Math.max(...validDates.map((d) => d.getTime())))

  const yearsDiff = latest.getFullYear() - earliest.getFullYear()
  return yearsDiff === 0 ? 1 : yearsDiff + 1
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
  payload?: EventAttendanceDataPoint & { label: string }
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
    <div
      className="border-border/50 bg-background rounded-lg border px-3 py-2 text-xs shadow-xl"
      role="tooltip"
      aria-live="polite"
    >
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
          <span className="text-muted-foreground flex-1">Compareceram</span>
          <span className="font-mono font-medium tabular-nums">
            {dataPoint.compareceram}
          </span>
        </div>
      </div>
    </div>
  )
}

const MIN_CHART_WIDTH = 600
const WIDTH_PER_EVENT = 100

export function SeasonalityChart({ data, className }: SeasonalityChartProps) {
  const chartConfig: ChartConfig = {
    inscritos: {
      label: 'Inscritos',
      color: 'var(--chart-1)',
    },
    compareceram: {
      label: 'Compareceram',
      color: 'var(--chart-2)',
    },
  }

  const chartData = useMemo(
    () =>
      data.map((item) => ({
        ...item,
        label: `${item.emoji} ${item.title}\n${formatDate(item.date)}`,
      })),
    [data]
  )

  const minWidth = useMemo(
    () => Math.max(MIN_CHART_WIDTH, data.length * WIDTH_PER_EVENT),
    [data.length]
  )

  const yearsSpan = calculateYearsSpan(data)
  const totalEvents = data.length

  return (
    <div>
      <div className="overflow-x-auto">
        <div style={{ minWidth }}>
          <ChartContainer
            config={chartConfig}
            className={className}
            role="img"
            aria-label="Análise de sazonalidade - inscrições e comparecimento ao longo do tempo"
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
              <Bar dataKey="inscritos" fill="var(--chart-1)" radius={4} />
              <Bar dataKey="compareceram" fill="var(--chart-2)" radius={4} />
            </RechartsBarChart>
          </ChartContainer>
        </div>
      </div>
      {totalEvents > 0 && (
        <div className="mt-4 text-center text-sm text-muted-foreground">
          Baseado em {totalEvents} {totalEvents === 1 ? 'evento' : 'eventos'} ao
          longo de {yearsSpan} {yearsSpan === 1 ? 'ano' : 'anos'}
        </div>
      )}
    </div>
  )
}
