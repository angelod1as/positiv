interface MultiLineXAxisTickProps {
  x?: string | number
  y?: string | number
  payload?: { value: string }
}

export function MultiLineXAxisTick({
  x,
  y,
  payload,
}: MultiLineXAxisTickProps) {
  if (x === undefined || y === undefined || !payload?.value) return null

  const [firstLine, secondLine = ''] = payload.value.split('\n')

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
