export const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-6)',
  'var(--chart-7)',
] as const

export const CHART_COLORS_EXTENDED = [
  ...CHART_COLORS,
  'oklch(0.55 0.15 250)',
  'oklch(0.65 0.20 330)',
  'oklch(0.70 0.15 140)',
  'oklch(0.60 0.18 60)',
  'oklch(0.50 0.20 280)',
] as const

export function getChartColor(index: number, extended = false): string {
  const palette = extended ? CHART_COLORS_EXTENDED : CHART_COLORS
  return palette[index % palette.length]
}
