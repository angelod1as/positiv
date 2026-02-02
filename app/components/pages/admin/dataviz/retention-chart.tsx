import { ReferenceLine } from 'recharts'
import type { RetentionDataPoint } from '~/business/admin/dataviz/dataviz.types'
import { BarChart } from '~/components/molecules/charts/bar-chart'
import type { ChartConfig } from '~/components/ui/chart'
import type { ChartDataPoint, ChartSeries } from '~/types/chart.types'

interface RetentionChartProps {
  data: RetentionDataPoint[]
  className?: string
}

function transformData(data: RetentionDataPoint[]): ChartDataPoint[] {
  return data.map((point) => ({
    events_attended: point.events_attended >= 7 ? '7+' : String(point.events_attended),
    events_attended_num: point.events_attended,
    num_people: point.num_people,
  }))
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

  const numPeople = data.num_people
  const eventsLabel = data.events_attended
  const festasWord = eventsLabel === '1' ? 'festa' : 'festas'

  return (
    <div className="border-border/50 bg-background rounded-lg border px-3 py-2 text-xs shadow-xl">
      <div className="font-mono font-medium tabular-nums">
        {numPeople} {numPeople === 1 ? 'pessoa foi' : 'pessoas foram'} a {eventsLabel}{' '}
        {festasWord}
      </div>
    </div>
  )
}

const chartConfig: ChartConfig = {
  num_people: {
    label: 'Pessoas',
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
        aria-label="Gráfico de frequência de comparecimento"
        className="flex h-[300px] items-center justify-center text-muted-foreground"
      >
        Nenhum dado de retenção disponível
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
      ariaLabel="Gráfico de frequência de comparecimento"
      tooltipContent={<CustomTooltipContent />}
    >
      <ReferenceLine
        y={0}
        stroke="transparent"
        label={{
          value: `Total: ${totalAttendees} pessoas únicas`,
          position: 'insideTopRight',
          fill: 'hsl(var(--muted-foreground))',
          fontSize: 12,
        }}
      />
    </BarChart>
  )
}
