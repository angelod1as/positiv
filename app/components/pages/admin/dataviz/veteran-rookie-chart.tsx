import type { VeteranRookieDataPoint } from '~/business/admin/dataviz/dataviz.types'
import { AreaChart } from '~/components/molecules/charts/area-chart'
import { adminDatavizCopy } from '~/copy/admin/dataviz'
import type { ChartConfig } from '~/components/ui/chart'
import { buildEventLabel } from '~/lib/helpers/chart-utils'

const veteranRookieCopy = adminDatavizCopy.veteranRookieChart

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
    label: veteranRookieCopy.veterans,
    color: 'var(--chart-3)',
  },
  rookies: {
    label: veteranRookieCopy.rookies,
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
          <span className="chart-tooltip-label">
            {veteranRookieCopy.veterans}
          </span>
          <span className="chart-tooltip-value">{dataPoint.veterans}</span>
        </div>
        <div className="chart-tooltip-row">
          <span
            className="chart-tooltip-swatch"
            style={{ backgroundColor: chartConfig.rookies.color }}
          />
          <span className="chart-tooltip-label">
            {veteranRookieCopy.rookies}
          </span>
          <span className="chart-tooltip-value">{dataPoint.rookies}</span>
        </div>
        <div className="chart-tooltip-row">
          <span className="chart-tooltip-label">
            {veteranRookieCopy.total}
          </span>
          <span className="chart-tooltip-value">{total}</span>
        </div>
        <div className="chart-tooltip-row">
          <span className="chart-tooltip-label">
            {veteranRookieCopy.veteranPercentage}
          </span>
          <span className="chart-tooltip-value">{veteranRookieCopy.percentage(veteranPercentage.toFixed(1))}</span>
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
      ariaLabel={veteranRookieCopy.ariaLabel}
      tooltipContent={<CustomTooltipContent />}
    />
  )
}
