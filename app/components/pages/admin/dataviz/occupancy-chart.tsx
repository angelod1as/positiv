import { format, parseISO } from 'date-fns'
import { ReferenceLine } from 'recharts'
import type { OccupancyDataPoint } from '~/business/admin/dataviz/dataviz.types'
import { LineChart } from '~/components/molecules/charts/line-chart'
import type { ChartConfig } from '~/components/ui/chart'
import type { ChartDataPoint, ChartSeries } from '~/types/chart.types'

interface OccupancyChartProps {
  data: OccupancyDataPoint[]
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

function transformData(data: OccupancyDataPoint[]): ChartDataPoint[] {
  return data.map((point) => ({
    event: `${point.emoji} ${point.title}\n${formatDate(point.date)}`,
    occupancy_pct: point.occupancy_pct,
    compareceram: point.compareceram,
    total_spots: point.total_spots,
    date: point.date,
  }))
}

function calculateAverage(data: OccupancyDataPoint[]): number {
  if (data.length === 0) return 0
  const sum = data.reduce((acc, point) => acc + point.occupancy_pct, 0)
  return Math.round(sum / data.length)
}

const chartConfig: ChartConfig = {
  occupancy_pct: {
    label: 'Taxa de Ocupação',
    color: 'hsl(var(--chart-1))',
  },
}

const series: ChartSeries[] = [
  {
    dataKey: 'occupancy_pct',
    color: 'hsl(var(--chart-1))',
  },
]

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

  const chartData = transformData(data)
  const averageOccupancy = calculateAverage(data)
  const minWidth = Math.max(600, data.length * 100)

  const averageLabelPosition = averageOccupancy > 90 ? 'insideTopLeft' : 'insideBottomRight'

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth }}>
        <LineChart
          data={chartData}
          config={chartConfig}
          series={series}
          xAxisKey="event"
          className={className}
          ariaLabel="Gráfico de taxa de ocupação por evento"
        >
          <ReferenceLine
            y={100}
            stroke="hsl(var(--muted-foreground))"
            strokeDasharray="3 3"
            label={{
              value: 'Capacidade Total (100%)',
              position: 'insideTopRight',
              fill: 'hsl(var(--muted-foreground))',
              fontSize: 12,
            }}
          />
          <ReferenceLine
            y={averageOccupancy}
            stroke="hsl(var(--chart-2))"
            strokeDasharray="3 3"
            label={{
              value: `Média: ${averageOccupancy}%`,
              position: averageLabelPosition,
              fill: 'hsl(var(--chart-2))',
              fontSize: 12,
            }}
          />
        </LineChart>
      </div>
    </div>
  )
}
