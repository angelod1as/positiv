import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
} from 'recharts'
import { format, parse } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { GrowthDataPoint } from '~/business/admin/dataviz/dataviz.types'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
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
            <ChartTooltip content={<ChartTooltipContent />} />
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
          </ComposedChart>
        </ChartContainer>
      </div>
    </div>
  )
}
