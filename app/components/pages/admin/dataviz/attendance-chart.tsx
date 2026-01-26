import { useState } from 'react'
import type { EventAttendanceDataPoint } from '~/business/admin/dataviz/dataviz.types'
import { LineChart } from '~/components/molecules/charts/line-chart'
import type { ChartConfig } from '~/components/ui/chart'

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
    label: `${item.emoji} ${item.title}`,
  }))

  const visibleSeries = SERIES_CONFIG.filter(
    (s) => !hiddenSeries.has(s.dataKey)
  ).map((s) => ({
    dataKey: s.dataKey,
    color: s.color,
  }))

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

  const minWidth = Math.max(600, data.length * 100)

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth }}>
        <LineChart
          data={chartData}
          config={chartConfig}
          series={visibleSeries}
          xAxisKey="label"
          xAxisFormatter={(value: string) => value}
          className={className}
          ariaLabel="Presença por evento"
          showLegend={false}
        />
      </div>
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
              className={`flex items-center gap-2 rounded px-2 py-1 text-sm transition-opacity hover:bg-muted ${
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
