import { AreaChart, Brush, XAxis } from "recharts"
import { ChartContainer, type ChartConfig } from "~/components/ui/chart"

const chartConfig: ChartConfig = {
  inscritos: { label: "Candidaturas", color: "var(--chart-1)" },
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
      <p className="text-sm text-muted-foreground">
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
          <Brush
            dataKey="label"
            height={30}
            stroke="var(--chart-2)"
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
