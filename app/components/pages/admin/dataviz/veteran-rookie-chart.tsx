import { format, parseISO } from 'date-fns'
import type { VeteranRookieDataPoint } from '~/business/admin/dataviz/dataviz.types'
import { AreaChart } from '~/components/molecules/charts/area-chart'
import type { ChartConfig } from '~/components/ui/chart'
import type { ReactElement } from 'react'

interface VeteranRookieChartProps {
  data: VeteranRookieDataPoint[]
  className?: string
}

const series = [
  { dataKey: 'veterans' },
  { dataKey: 'rookies' },
]

const chartConfig: ChartConfig = {
  veterans: {
    label: 'Veteranos',
    color: 'var(--chart-3)',
  },
  rookies: {
    label: 'Novatos',
    color: 'var(--chart-1)',
  },
}

function formatDate(dateString: string): string {
  try {
    const date = parseISO(dateString)
    return format(date, 'dd/MM/yy')
  } catch {
    return dateString
  }
}

interface TooltipPayloadItem {
  dataKey?: string
  value?: number
  color?: string
  fill?: string
  payload?: VeteranRookieDataPoint & { label: string }
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: string
}

function CustomTooltipContent({ active, payload, label }: CustomTooltipProps): ReactElement | null {
  if (!active || !payload?.length) return null

  const dataPoint = payload[0]?.payload

  if (!dataPoint) return null

  const total = dataPoint.veterans + dataPoint.rookies
  const veteranPercentage = total > 0 ? (dataPoint.veterans / total) * 100 : 0

  return (
    <div className="border-border/50 bg-background rounded-lg border px-3 py-2 text-xs shadow-xl">
      <div className="mb-2 font-medium">
        <div>{label}</div>
      </div>
      <div className="grid gap-1.5">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
            style={{ backgroundColor: chartConfig.veterans.color }}
          />
          <span className="text-muted-foreground flex-1">Veteranos</span>
          <span className="font-mono font-medium tabular-nums">
            {dataPoint.veterans}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
            style={{ backgroundColor: chartConfig.rookies.color }}
          />
          <span className="text-muted-foreground flex-1">Novatos</span>
          <span className="font-mono font-medium tabular-nums">
            {dataPoint.rookies}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground flex-1">Total</span>
          <span className="font-mono font-medium tabular-nums">
            {total}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground flex-1">% Veteranos</span>
          <span className="font-mono font-medium tabular-nums">
            {veteranPercentage.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  )
}

export function VeteranRookieChart({ data, className }: VeteranRookieChartProps) {
  const chartData = data.map((item) => ({
    ...item,
    label: `${item.emoji} ${item.title} ${formatDate(item.date)}`,
  }))

  return (
    <AreaChart
      data={chartData}
      config={chartConfig}
      series={series}
      xAxisKey="label"
      stacked={true}
      className={className}
      ariaLabel="Gráfico de proporção veteranos vs novatos ao longo do tempo"
      tooltipContent={<CustomTooltipContent />}
    />
  )
}
