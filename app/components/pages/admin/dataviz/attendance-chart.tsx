import { useState } from 'react'
import {
  CartesianGrid,
  LabelList,
  Line,
  LineChart as RechartsLineChart,
  XAxis,
  YAxis,
} from 'recharts'
import type { EventAttendanceDataPoint } from '~/business/admin/dataviz/dataviz.types'
import { MultiLineXAxisTick } from '~/components/atoms/charts/multi-line-x-axis-tick'
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from '~/components/ui/chart'
import { buildEventLabel } from '~/lib/helpers/chart-utils'

const LABELED_SERIES = new Set(['inscritos', 'compareceram'])

const SERIES_CONFIG = [
  { dataKey: 'inscritos', label: 'Inscritos', color: 'var(--chart-1)' },
  { dataKey: 'compareceram', label: 'Compareceram', color: 'var(--chart-2)' },
  { dataKey: 'nao_foram', label: 'Não foram', color: 'var(--chart-3)' },
  { dataKey: 'will_not_go', label: 'Avisaram', color: 'var(--chart-4)' },
  { dataKey: 'rodizio', label: 'Rodízio', color: 'var(--chart-5)' },
  { dataKey: 'vagas_sociais', label: 'Vagas sociais', color: 'var(--chart-6)' },
  { dataKey: 'staff', label: 'Staff', color: 'var(--chart-7)' },
] as const

type SeriesKey = (typeof SERIES_CONFIG)[number]['dataKey']

interface AttendanceChartProps {
  data: EventAttendanceDataPoint[]
  className?: string
}

interface TooltipPayloadItem {
  dataKey?: string
  value?: number
  color?: string
  stroke?: string
  payload?: Record<string, unknown>
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: string
}

function CustomTooltipContent({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null

  const [firstLine, secondLine] = (label || '').split('\n')

  return (
    <div className="chart-tooltip">
      <div className="mb-2 font-medium">
        <div>{firstLine}</div>
        {secondLine && <div className="text-muted-foreground">{secondLine}</div>}
      </div>
      <div className="grid gap-1.5">
        {payload.map((item) => {
          const config = SERIES_CONFIG.find((s) => s.dataKey === item.dataKey)
          const color = item.stroke || item.color || config?.color
          return (
            <div key={item.dataKey} className="chart-tooltip-row">
              <span
                className="chart-tooltip-swatch"
                style={{ backgroundColor: color }}
              />
              <span className="chart-tooltip-label">
                {config?.label || item.dataKey}
              </span>
              <span className="chart-tooltip-value">
                {item.value?.toLocaleString()}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function AttendanceChart({ data, className }: AttendanceChartProps) {
  const [hiddenSeries, setHiddenSeries] = useState<Set<SeriesKey>>(new Set())

  const chartConfig: ChartConfig = SERIES_CONFIG.reduce(
    (acc, { dataKey, label, color }) => ({
      ...acc,
      [dataKey]: { label, color },
    }),
    {} as ChartConfig
  )

  const chartData = data.map((item) => ({
    ...item,
    label: buildEventLabel(item),
  }))

  const visibleSeries = SERIES_CONFIG.filter(
    (s) => !hiddenSeries.has(s.dataKey)
  )

  const toggleSeries = (dataKey: SeriesKey) => {
    setHiddenSeries((prev) => {
      const next = new Set(prev)
      if (next.has(dataKey)) {
        next.delete(dataKey)
      } else {
        next.add(dataKey)
      }
      return next
    })
  }

  return (
    <div>
      <ChartContainer
        config={chartConfig}
        className={className}
        role="img"
        aria-label="Presença por evento"
      >
        <RechartsLineChart data={chartData}>
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
          {visibleSeries.map((s) => (
            <Line
              key={s.dataKey}
              dataKey={s.dataKey}
              type="monotone"
              stroke={s.color}
              strokeWidth={2}
              dot={{ r: 3 }}
            >
              {LABELED_SERIES.has(s.dataKey) && (
                <LabelList
                  dataKey={s.dataKey}
                  position="top"
                  offset={10}
                  className="fill-foreground text-xs"
                />
              )}
            </Line>
          ))}
        </RechartsLineChart>
      </ChartContainer>
      <div className="mt-4 flex flex-wrap justify-center gap-4">
        {SERIES_CONFIG.map(({ dataKey, label, color }) => {
          const isHidden = hiddenSeries.has(dataKey)
          return (
            <button
              key={dataKey}
              type="button"
              onClick={() => toggleSeries(dataKey)}
              data-legend-item
              data-hidden={isHidden}
              className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm transition-opacity hover:bg-muted ${
                isHidden ? 'opacity-40' : ''
              }`}
            >
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
