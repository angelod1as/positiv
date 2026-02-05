import { useMemo } from 'react'
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts'
import { isValid, parseISO } from 'date-fns'
import type { EventAttendanceDataPoint } from '~/business/admin/dataviz/dataviz.types'
import { MultiLineXAxisTick } from '~/components/atoms/charts/multi-line-x-axis-tick'
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from '~/components/ui/chart'
import { buildEventLabel } from '~/lib/helpers/chart-utils'

interface SeasonalityChartProps {
  data: EventAttendanceDataPoint[]
  className?: string
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
    <div className="chart-tooltip" role="tooltip" aria-live="polite">
      <div className="mb-2 font-medium">
        <div>{firstLine}</div>
        {secondLine && <div className="text-muted-foreground">{secondLine}</div>}
      </div>
      <div className="grid gap-1.5">
        <div className="chart-tooltip-row">
          <span className="chart-tooltip-swatch" style={{ backgroundColor: 'var(--chart-1)' }} />
          <span className="chart-tooltip-label">Inscritos</span>
          <span className="chart-tooltip-value">{dataPoint.inscritos}</span>
        </div>
        <div className="chart-tooltip-row">
          <span className="chart-tooltip-swatch" style={{ backgroundColor: 'var(--chart-2)' }} />
          <span className="chart-tooltip-label">Compareceram</span>
          <span className="chart-tooltip-value">{dataPoint.compareceram}</span>
        </div>
      </div>
    </div>
  )
}

export function SeasonalityChart({ data, className }: SeasonalityChartProps) {
  const chartConfig: ChartConfig = {
    inscritos: { label: 'Inscritos', color: 'var(--chart-1)' },
    compareceram: { label: 'Compareceram', color: 'var(--chart-2)' },
  }

  const chartData = useMemo(
    () =>
      data.map((item) => ({
        ...item,
        label: buildEventLabel(item),
      })),
    [data]
  )

  const yearsSpan = calculateYearsSpan(data)
  const totalEvents = data.length

  return (
    <div>
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
            tick={MultiLineXAxisTick}
          />
          <YAxis tickLine={false} axisLine={false} tickMargin={8} />
          <ChartTooltip content={<CustomTooltipContent />} isAnimationActive={false} />
          <Bar dataKey="inscritos" fill="var(--chart-1)" radius={4} />
          <Bar dataKey="compareceram" fill="var(--chart-2)" radius={4} />
        </RechartsBarChart>
      </ChartContainer>
      {totalEvents > 0 && (
        <div className="mt-4 text-center text-sm text-muted-foreground">
          Baseado em {totalEvents} {totalEvents === 1 ? 'evento' : 'eventos'} ao
          longo de {yearsSpan} {yearsSpan === 1 ? 'ano' : 'anos'}
        </div>
      )}
    </div>
  )
}
