const PALETTE_SIZE = 8

export const chartColor = (index: number) =>
  `var(--chart-${(index % PALETTE_SIZE) + 1})`

export const chartHighlight = "var(--chart-highlight)"
