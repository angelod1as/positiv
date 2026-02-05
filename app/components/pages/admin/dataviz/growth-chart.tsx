import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  XAxis,
  YAxis,
} from 'recharts'
import { format, isValid, parse } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { GrowthDataPoint } from '~/business/admin/dataviz/dataviz.types'
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from '~/components/ui/chart'

interface GrowthChartProps {
  data: GrowthDataPoint[]
  className?: string
}

function formatMonth(monthString: string): string {
  const date = parse(monthString, 'yyyy-MM', new Date())
  if (isValid(date)) {
    return format(date, 'MMM/yy', { locale: ptBR })
  }
  return monthString
}

interface TooltipPayloadItem {
  dataKey?: string
  value?: number
  color?: string
  stroke?: string
  fill?: string
  payload?: GrowthDataPoint & { label: string }
}

interface CustomTooltipProps {
  active?: boolean
  payload?: readonly TooltipPayloadItem[]
  label?: string | number
}

function CustomTooltipContent({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null

  const dataPoint = payload[0]?.payload

  if (!dataPoint) return null

  return (
    <div className="chart-tooltip">
      <div className="mb-2 font-medium">
        <div>{label}</div>
      </div>
      <div className="grid gap-1.5">
        <div className="chart-tooltip-row">
          <span className="chart-tooltip-swatch" style={{ backgroundColor: 'var(--chart-1)' }} />
          <span className="chart-tooltip-label">Novos cadastros</span>
          <span className="chart-tooltip-value">{dataPoint.new_profiles}</span>
        </div>
        <div className="chart-tooltip-row">
          <span className="chart-tooltip-swatch" style={{ backgroundColor: 'var(--chart-2)' }} />
          <span className="chart-tooltip-label">Total acumulado</span>
          <span className="chart-tooltip-value">{dataPoint.cumulative}</span>
        </div>
      </div>
    </div>
  )
}

export function GrowthChart({ data, className }: GrowthChartProps) {
  const chartConfig: ChartConfig = {
    new_profiles: { label: 'Novos cadastros', color: 'var(--chart-1)' },
    cumulative: { label: 'Total acumulado', color: 'var(--chart-2)' },
  }

  const chartData = data.map((item) => ({
    ...item,
    label: formatMonth(item.month),
  }))

  const julyMigration = chartData.find((item) => item.month === '2025-07')

  return (
    <ChartContainer
      config={chartConfig}
      className={className}
      role="img"
      aria-label="Gráfico de crescimento de perfis cadastrados"
    >
      <ComposedChart data={chartData}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <YAxis
          yAxisId="left"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <ChartTooltip content={CustomTooltipContent} isAnimationActive={false} />
        <Bar
          yAxisId="left"
          dataKey="new_profiles"
          fill="var(--color-new_profiles)"
          radius={4}
        />
        <Line
          yAxisId="right"
          dataKey="cumulative"
          type="monotone"
          stroke="var(--color-cumulative)"
          strokeWidth={2}
          dot={{ r: 4 }}
        />
        {julyMigration && (
          <ReferenceDot
            x={julyMigration.label}
            y={julyMigration.new_profiles}
            yAxisId="left"
            r={8}
            fill="var(--chart-3)"
            stroke="white"
            strokeWidth={2}
            label={{
              value: 'Migração do sistema anterior',
              position: 'top',
              fill: 'var(--muted-foreground)',
              fontSize: 10,
            }}
          />
        )}
      </ComposedChart>
    </ChartContainer>
  )
}
