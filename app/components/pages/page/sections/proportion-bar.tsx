import { chartColor, chartHighlight } from "./chart-color"

export type ProportionPart = {
  key: string
  label: string
  value: number
  highlight?: boolean | null
}

type ProportionBarProps = {
  parts: ProportionPart[]
  format: (value: number) => string
}

// Below this share a segment is too thin for its label, which moves to the
// list beside the bar.
const LABEL_INSIDE_FROM = 0.08

// One thick bar of the whole, split into its parts: lying down on wider
// screens, standing up at nearly the height of the screen on a phone.
export const ProportionBar = ({ parts, format }: ProportionBarProps) => {
  const total = parts.reduce((sum, part) => sum + Math.max(part.value, 0), 0)
  const drawn = parts.map((part, index) => ({
    ...part,
    share: total > 0 ? Math.max(part.value, 0) / total : 0,
    color: part.highlight ? chartHighlight : chartColor(index),
  }))
  const outside = drawn.filter((part) => part.share < LABEL_INSIDE_FROM)

  return (
    <div className="flex gap-4 md:flex-col">
      <div className="flex h-[80svh] w-24 shrink-0 flex-col overflow-hidden rounded-xl md:h-20 md:w-full md:flex-row">
        {drawn.map((part) => (
          <div
            key={part.key}
            data-part
            className="flex min-h-0 min-w-0 flex-col items-center justify-center gap-0.5 p-1 text-center text-sm leading-tight text-white"
            style={{
              flexBasis: `${Math.round(part.share * 1000) / 10}%`,
              backgroundColor: part.color,
            }}
          >
            {part.share >= LABEL_INSIDE_FROM && (
              <>
                <span className="font-semibold">{part.label}</span>
                <span className="tabular-nums">{format(part.value)}</span>
              </>
            )}
          </div>
        ))}
      </div>
      {outside.length > 0 && (
        <ul className="flex flex-col justify-center gap-2 text-sm md:flex-row md:flex-wrap md:justify-start md:gap-x-6">
          {outside.map((part) => (
            <li key={part.key} className="flex items-center gap-2">
              <span
                data-swatch
                className="size-3 shrink-0 rounded-sm"
                style={{ backgroundColor: part.color }}
              />
              <span>{part.label}</span>
              <span className="font-bold tabular-nums">
                {format(part.value)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
