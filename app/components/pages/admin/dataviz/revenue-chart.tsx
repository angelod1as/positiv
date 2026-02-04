import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import type { EventRevenueDataPoint } from '~/business/admin/dataviz/dataviz.types'
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from '~/components/ui/chart'

interface RevenueChartProps {
  data: EventRevenueDataPoint[]
  className?: string
}

function formatDate(dateString: string): string {
  try {
    const date = parseISO(dateString)
    return format(date, 'dd/MM/yy')
  } catch {
    return dateString
  }
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

interface CustomXAxisTickProps {
  x?: string | number
  y?: string | number
  payload?: { value: string }
}

function CustomXAxisTick({ x, y, payload }: CustomXAxisTickProps) {
  if (!payload?.value) return null

  const [firstLine, secondLine] = payload.value.split('\n')

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={12}
        textAnchor="middle"
        className="fill-muted-foreground text-xs"
      >
        {firstLine}
      </text>
      <text
        x={0}
        y={0}
        dy={26}
        textAnchor="middle"
        className="fill-muted-foreground text-xs"
      >
        {secondLine}
      </text>
    </g>
  )
}

interface TooltipPayloadItem {
  dataKey?: string
  value?: number
  color?: string
  stroke?: string
  fill?: string
  payload?: EventRevenueDataPoint & { label: string }
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: string
}

function CustomTooltipContent({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null

  const [firstLine, secondLine] = (label || '').split('\n')
  const dataPoint = payload[0]?.payload

  if (!dataPoint) return null

  const ticketMedio = dataPoint.num_pagantes > 0
    ? dataPoint.faturamento_total / dataPoint.num_pagantes
    : 0

  return (
    <div className="border-border/50 bg-background rounded-lg border px-3 py-2 text-xs shadow-xl">
      <div className="mb-2 font-medium">
        <div>{firstLine}</div>
        {secondLine && <div className="text-muted-foreground">{secondLine}</div>}
      </div>
      <div className="grid gap-1.5">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
            style={{ backgroundColor: 'var(--chart-1)' }}
          />
          <span className="text-muted-foreground flex-1">Faturamento</span>
          <span className="font-mono font-medium tabular-nums">
            {formatCurrency(dataPoint.faturamento_total)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
            style={{ backgroundColor: 'var(--chart-2)' }}
          />
          <span className="text-muted-foreground flex-1">Preço do ingresso</span>
          <span className="font-mono font-medium tabular-nums">
            {formatCurrency(dataPoint.ticket_price)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground flex-1">Pagantes</span>
          <span className="font-mono font-medium tabular-nums">
            {dataPoint.num_pagantes}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground flex-1">Ticket médio</span>
          <span className="font-mono font-medium tabular-nums">
            {formatCurrency(ticketMedio)}
          </span>
        </div>
      </div>
    </div>
  )
}

export function RevenueChart({ data, className }: RevenueChartProps) {
  const chartConfig: ChartConfig = {
    faturamento_total: {
      label: 'Faturamento',
      color: 'var(--chart-1)',
    },
    ticket_price: {
      label: 'Preço do ingresso',
      color: 'var(--chart-2)',
    },
  }

  const chartData = data.map((item) => ({
    ...item,
    label: `${item.emoji} ${item.title}\n${formatDate(item.date)}`,
  }))

  const minWidth = Math.max(600, data.length * 120)

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth }}>
        <ChartContainer
          config={chartConfig}
          className={className}
          role="img"
          aria-label="Faturamento por evento"
        >
          <ComposedChart data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              height={50}
              tick={CustomXAxisTick}
            />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip content={<CustomTooltipContent />} isAnimationActive={false} />
            <Bar
              dataKey="faturamento_total"
              fill="var(--color-faturamento_total)"
              radius={4}
            />
            <Line
              dataKey="ticket_price"
              type="monotone"
              stroke="var(--color-ticket_price)"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          </ComposedChart>
        </ChartContainer>
      </div>
    </div>
  )
}
