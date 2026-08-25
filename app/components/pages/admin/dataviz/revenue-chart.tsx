import {
  Bar,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Line,
  XAxis,
  YAxis,
} from 'recharts'
import type { EventRevenueDataPoint } from '~/business/admin/dataviz/dataviz.types'
import { MultiLineXAxisTick } from '~/components/atoms/charts/multi-line-x-axis-tick'
import { adminDatavizCopy } from '~/copy/admin/dataviz'
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from '~/components/ui/chart'
import { buildEventLabel } from '~/lib/helpers/chart-utils'
import { formatCurrency } from '~/lib/helpers/format-currency'

const revenueCopy = adminDatavizCopy.revenueChart

interface RevenueChartProps {
  data: EventRevenueDataPoint[]
  className?: string
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
    <div className="chart-tooltip">
      <div className="mb-2 font-medium">
        <div>{firstLine}</div>
        {secondLine && <div className="text-muted-foreground">{secondLine}</div>}
      </div>
      <div className="grid gap-1.5">
        <div className="chart-tooltip-row">
          <span className="chart-tooltip-swatch" style={{ backgroundColor: 'var(--chart-1)' }} />
          <span className="chart-tooltip-label">{revenueCopy.revenue}</span>
          <span className="chart-tooltip-value">{formatCurrency(dataPoint.faturamento_total)}</span>
        </div>
        <div className="chart-tooltip-row">
          <span className="chart-tooltip-swatch" style={{ backgroundColor: 'var(--chart-2)' }} />
          <span className="chart-tooltip-label">
            {revenueCopy.ticketPrice}
          </span>
          <span className="chart-tooltip-value">{formatCurrency(dataPoint.ticket_price)}</span>
        </div>
        <div className="chart-tooltip-row">
          <span className="chart-tooltip-label">{revenueCopy.payers}</span>
          <span className="chart-tooltip-value">{dataPoint.num_pagantes}</span>
        </div>
        <div className="chart-tooltip-row">
          <span className="chart-tooltip-label">
            {revenueCopy.averageTicket}
          </span>
          <span className="chart-tooltip-value">{formatCurrency(ticketMedio)}</span>
        </div>
      </div>
    </div>
  )
}

export function RevenueChart({ data, className }: RevenueChartProps) {
  const chartConfig: ChartConfig = {
    faturamento_total: { label: revenueCopy.revenue, color: 'var(--chart-1)' },
    ticket_price: { label: revenueCopy.ticketPrice, color: 'var(--chart-2)' },
  }

  const chartData = data.map((item) => ({
    ...item,
    label: buildEventLabel(item),
  }))

  return (
    <ChartContainer
      config={chartConfig}
      className={className}
      role="img"
      aria-label={revenueCopy.ariaLabel}
    >
      <ComposedChart data={chartData}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          height={50}
          tick={MultiLineXAxisTick}
        />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} />
        <ChartTooltip content={<CustomTooltipContent />} isAnimationActive={false} />
        <Bar
          dataKey="faturamento_total"
          fill="var(--color-faturamento_total)"
          radius={4}
        >
          <LabelList
            dataKey="faturamento_total"
            position="top"
            className="fill-foreground text-xs"
            formatter={(value) => formatCurrency(Number(value ?? 0))}
          />
        </Bar>
        <Line
          dataKey="ticket_price"
          type="monotone"
          stroke="var(--color-ticket_price)"
          strokeWidth={2}
          dot={{ r: 4 }}
        />
      </ComposedChart>
    </ChartContainer>
  )
}
