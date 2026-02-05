import {
  CartesianGrid,
  LabelList,
  Line,
  LineChart as RechartsLineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts'
import type { OccupancyDataPoint } from '~/business/admin/dataviz/dataviz.types'
import { MultiLineXAxisTick } from '~/components/atoms/charts/multi-line-x-axis-tick'
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from '~/components/ui/chart'
import { buildEventLabel } from '~/lib/helpers/chart-utils'

interface OccupancyChartProps {
  data: OccupancyDataPoint[]
  className?: string
}

function calculateAverage(data: OccupancyDataPoint[]): number {
  if (data.length === 0) return 0
  const totalAttendees = data.reduce((acc, point) => acc + point.compareceram, 0)
  const totalSpots = data.reduce((acc, point) => acc + point.total_spots, 0)
  if (totalSpots === 0) return 0
  return Math.round((totalAttendees / totalSpots) * 100)
}

interface TooltipPayloadItem {
  dataKey?: string
  value?: number
  color?: string
  stroke?: string
  payload?: Record<string, unknown>
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
    <div className="chart-tooltip">
      <div className="mb-2 font-medium">
        <div>{firstLine}</div>
        {secondLine && <div className="text-muted-foreground">{secondLine}</div>}
      </div>
      <div className="grid gap-1.5">
        <div className="chart-tooltip-row">
          <span className="chart-tooltip-swatch" style={{ backgroundColor: 'var(--chart-1)' }} />
          <span className="chart-tooltip-label">Ocupação</span>
          <span className="chart-tooltip-value">{Number(dataPoint.occupancy_pct ?? 0)}%</span>
        </div>
        <div className="chart-tooltip-row">
          <span className="chart-tooltip-label">Compareceram</span>
          <span className="chart-tooltip-value">{Number(dataPoint.compareceram ?? 0)} / {Number(dataPoint.total_spots ?? 0)}</span>
        </div>
      </div>
    </div>
  )
}

const chartConfig: ChartConfig = {
  occupancy_pct: {
    label: 'Taxa de Ocupação',
    color: 'var(--chart-1)',
  },
}

export function OccupancyChart({ data, className }: OccupancyChartProps) {
  if (!data || data.length === 0) {
    return (
      <div
        data-chart
        role="img"
        aria-label="Gráfico de taxa de ocupação por evento"
        className="flex h-[300px] items-center justify-center text-muted-foreground"
      >
        Nenhum dado de ocupação disponível
      </div>
    )
  }

  const chartData = data.map((point) => ({
    label: buildEventLabel(point),
    occupancy_pct: point.occupancy_pct,
    compareceram: point.compareceram,
    total_spots: point.total_spots,
  }))

  const averageOccupancy = calculateAverage(data)
  const averageLabelPosition = averageOccupancy > 90 ? 'insideTopLeft' : 'insideBottomRight'

  return (
    <ChartContainer
      config={chartConfig}
      className={className}
      role="img"
      aria-label="Gráfico de taxa de ocupação por evento"
    >
      <RechartsLineChart data={chartData}>
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
        <Line
          dataKey="occupancy_pct"
          type="monotone"
          stroke="var(--chart-1)"
          strokeWidth={2}
          dot={{ r: 4 }}
        >
          <LabelList
            dataKey="occupancy_pct"
            position="top"
            offset={10}
            className="fill-foreground text-xs"
            formatter={(value) => `${value ?? ''}%`}
          />
        </Line>
        <ReferenceLine
          y={100}
          stroke="var(--chart-5)"
          strokeDasharray="3 3"
          label={{
            value: 'Capacidade Total (100%)',
            position: 'insideTopRight',
            fill: 'var(--chart-5)',
            fontSize: 12,
          }}
        />
        <ReferenceLine
          y={averageOccupancy}
          stroke="var(--chart-2)"
          strokeDasharray="3 3"
          label={{
            value: `Média: ${averageOccupancy}%`,
            position: averageLabelPosition,
            fill: 'var(--chart-2)',
            fontSize: 12,
          }}
        />
      </RechartsLineChart>
    </ChartContainer>
  )
}
