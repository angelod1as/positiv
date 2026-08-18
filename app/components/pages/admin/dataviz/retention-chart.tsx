import { ReferenceLine } from 'recharts'
import type { RetentionDataPoint } from '~/business/admin/dataviz/dataviz.types'
import { BarChart } from '~/components/molecules/charts/bar-chart'
import { adminDatavizCopy } from '~/copy/admin/dataviz'
import type { ChartConfig } from '~/components/ui/chart'
import type { ChartDataPoint, ChartSeries } from '~/types/chart.types'

const retentionCopy = adminDatavizCopy.retentionChart

interface RetentionChartProps {
  data: RetentionDataPoint[]
  className?: string
}

function transformData(data: RetentionDataPoint[]): ChartDataPoint[] {
  const lessThan7 = data.filter((p) => p.events_attended < 7)
  const sevenAndUp = data.filter((p) => p.events_attended >= 7)

  const transformedData: ChartDataPoint[] = lessThan7.map((point) => ({
    events_attended: String(point.events_attended),
    events_attended_num: point.events_attended,
    num_people: point.num_people,
  }))

  if (sevenAndUp.length > 0) {
    const totalSevenAndUp = sevenAndUp.reduce((sum, p) => sum + p.num_people, 0)
    transformedData.push({
      events_attended: '7+',
      events_attended_num: 7,
      num_people: totalSevenAndUp,
    })
  }

  return transformedData.sort(
    (a, b) => (a.events_attended_num as number) - (b.events_attended_num as number)
  )
}

function calculateTotal(data: RetentionDataPoint[]): number {
  return data.reduce((sum, point) => sum + point.num_people, 0)
}

interface TooltipPayloadItem {
  payload?: {
    events_attended: string
    num_people: number
  }
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadItem[]
}

function CustomTooltipContent({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null

  const data = payload[0]?.payload
  if (!data) return null

  return (
    <div className="chart-tooltip">
      <div className="font-mono font-medium tabular-nums">
        {retentionCopy.attendance(data.num_people, data.events_attended)}
      </div>
    </div>
  )
}

const chartConfig: ChartConfig = {
  num_people: {
    label: retentionCopy.people,
    color: 'hsl(var(--chart-1))',
  },
}

const series: ChartSeries[] = [
  {
    dataKey: 'num_people',
  },
]

export function RetentionChart({ data, className }: RetentionChartProps) {
  if (!data || data.length === 0) {
    return (
      <div
        data-chart
        role="img"
        aria-label={retentionCopy.ariaLabel}
        className="flex h-[300px] items-center justify-center text-muted-foreground"
      >
        {retentionCopy.noData}
      </div>
    )
  }

  const chartData = transformData(data)
  const totalAttendees = calculateTotal(data)

  return (
    <BarChart
      data={chartData}
      config={chartConfig}
      series={series}
      xAxisKey="events_attended"
      className={className}
      ariaLabel={retentionCopy.ariaLabel}
      tooltipContent={<CustomTooltipContent />}
      showLegend={false}
      showValues
    >
      <ReferenceLine
        y={0}
        stroke="transparent"
        label={{
          value: retentionCopy.total(totalAttendees),
          position: 'insideTopRight',
          fill: 'hsl(var(--muted-foreground))',
          fontSize: 12,
        }}
      />
    </BarChart>
  )
}
