import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  XAxis,
  YAxis,
} from 'recharts'
import { format, parse } from 'date-fns'
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
  try {
    const date = parse(monthString, 'yyyy-MM', new Date())
    return format(date, 'MMM/yy', { locale: ptBR })
  } catch {
    return monthString
  }
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
  payload?: TooltipPayloadItem[]
  label?: string
}

function CustomTooltipContent({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null

  const dataPoint = payload[0]?.payload

  if (!dataPoint) return null

  return (
    <div className="border-border/50 bg-background rounded-lg border px-3 py-2 text-xs shadow-xl">
      <div className="mb-2 font-medium">
        <div>{label}</div>
      </div>
      <div className="grid gap-1.5">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
            style={{ backgroundColor: 'var(--chart-1)' }}
          />
          <span className="text-muted-foreground flex-1">Novos cadastros</span>
          <span className="font-mono font-medium tabular-nums">
            {dataPoint.new_profiles}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
            style={{ backgroundColor: 'var(--chart-2)' }}
          />
          <span className="text-muted-foreground flex-1">Total acumulado</span>
          <span className="font-mono font-medium tabular-nums">
            {dataPoint.cumulative}
          </span>
        </div>
      </div>
    </div>
  )
}

export function GrowthChart({ data, className }: GrowthChartProps) {
  const chartConfig: ChartConfig = {
    new_profiles: {
      label: 'Novos cadastros',
      color: 'var(--chart-1)',
    },
    cumulative: {
      label: 'Total acumulado',
      color: 'var(--chart-2)',
    },
  }

  const chartData = data.map((item) => ({
    ...item,
    label: formatMonth(item.month),
  }))

  const julyMigration = chartData.find((item) => item.month === '2025-07')

  const minWidth = Math.max(600, data.length * 80)

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth }}>
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
            <ChartTooltip content={<CustomTooltipContent />} />
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
      </div>
    </div>
  )
}
