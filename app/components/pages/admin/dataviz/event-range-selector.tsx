import { Area, AreaChart, Brush, XAxis } from 'recharts'
import {
  ChartContainer,
  type ChartConfig,
} from '~/components/ui/chart'

const chartConfig: ChartConfig = {
  inscritos: { label: 'Inscritos', color: 'var(--chart-1)' },
}

interface EventRangeSelectorProps {
  data: Array<{ label: string; inscritos: number }>
  startIndex: number
  endIndex: number
  onChange: (range: { startIndex?: number; endIndex?: number }) => void
}

export function EventRangeSelector({
  data,
  startIndex,
  endIndex,
  onChange,
}: EventRangeSelectorProps) {
  if (data.length <= 1) return null

  return (
    <div>
      <p className="mb-2 text-sm text-muted-foreground">
        Selecionar intervalo de eventos
      </p>
      <ChartContainer
        config={chartConfig}
        className="h-[60px]"
        role="img"
        aria-label="Selecionar intervalo de eventos"
      >
        <AreaChart data={data}>
          <XAxis dataKey="label" hide />
          <Area
            dataKey="inscritos"
            type="monotone"
            fill="var(--color-inscritos)"
            fillOpacity={0.3}
            stroke="var(--color-inscritos)"
            strokeWidth={1}
          />
          <Brush
            dataKey="label"
            height={30}
            stroke="var(--chart-1)"
            startIndex={startIndex}
            endIndex={endIndex}
            onChange={(range) =>
              onChange({
                startIndex: range.startIndex,
                endIndex: range.endIndex,
              })
            }
          />
        </AreaChart>
      </ChartContainer>
    </div>
  )
}
