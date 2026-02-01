import type { OccupancyDataPoint } from '~/business/admin/dataviz/dataviz.types'
import { LineChart } from '~/components/molecules/charts/line-chart'
import type { ChartConfig } from '~/components/ui/chart'
import type { ChartDataPoint, ChartSeries } from '~/types/chart.types'

interface OccupancyChartProps {
  data: OccupancyDataPoint[]
  className?: string
}

function transformData(data: OccupancyDataPoint[]): ChartDataPoint[] {
  return data.map((point) => ({
    event: `${point.emoji} ${point.title}`,
    occupancy_pct: point.occupancy_pct,
    compareceram: point.compareceram,
    total_spots: point.total_spots,
    date: point.date,
  }))
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
    return <div data-chart role="img" aria-label="Gráfico de taxa de ocupação por evento" />
  }

  const chartData = transformData(data)

  return (
    <LineChart
      data={chartData}
      config={chartConfig}
      series={series}
      xAxisKey="event"
      className={className}
      ariaLabel="Gráfico de taxa de ocupação por evento"
    />
  )
}
