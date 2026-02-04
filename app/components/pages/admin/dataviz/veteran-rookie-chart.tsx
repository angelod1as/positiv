import type { VeteranRookieDataPoint } from '~/business/admin/dataviz/dataviz.types'
import { AreaChart } from '~/components/molecules/charts/area-chart'
import type { ChartConfig } from '~/components/ui/chart'
import { buildEventLabel } from '~/lib/helpers/chart-utils'

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

function CustomTooltipContent({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null

  const dataPoint = payload[0]?.payload

  if (!dataPoint) return null

  const total = dataPoint.veterans + dataPoint.rookies
  const veteranPercentage = total > 0 ? (dataPoint.veterans / total) * 100 : 0

  return (
    <div className="chart-tooltip">
      <div className="mb-2 font-medium">
        <div>{label}</div>
      </div>
      <div className="grid gap-1.5">
        <div className="chart-tooltip-row">
          <span
            className="chart-tooltip-swatch"
            style={{ backgroundColor: chartConfig.veterans.color }}
          />
          <span className="chart-tooltip-label">Veteranos</span>
          <span className="chart-tooltip-value">{dataPoint.veterans}</span>
        </div>
        <div className="chart-tooltip-row">
          <span
            className="chart-tooltip-swatch"
            style={{ backgroundColor: chartConfig.rookies.color }}
          />
          <span className="chart-tooltip-label">Novatos</span>
          <span className="chart-tooltip-value">{dataPoint.rookies}</span>
        </div>
        <div className="chart-tooltip-row">
          <span className="chart-tooltip-label">Total</span>
          <span className="chart-tooltip-value">{total}</span>
        </div>
        <div className="chart-tooltip-row">
          <span className="chart-tooltip-label">% Veteranos</span>
          <span className="chart-tooltip-value">{veteranPercentage.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  )
}

export function VeteranRookieChart({ data, className }: VeteranRookieChartProps) {
  const chartData = data.map((item) => ({
    ...item,
    label: buildEventLabel(item),
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
