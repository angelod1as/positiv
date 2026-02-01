import type { OccupancyDataPoint } from '~/business/admin/dataviz/dataviz.types'

interface OccupancyChartProps {
  data: OccupancyDataPoint[]
  className?: string
}

export function OccupancyChart({ data }: OccupancyChartProps) {
  if (!data || data.length === 0) {
    return <div data-chart role="img" aria-label="Gráfico de taxa de ocupação por evento" />
  }

  return <div data-chart role="img" aria-label="Gráfico de taxa de ocupação por evento" />
}
