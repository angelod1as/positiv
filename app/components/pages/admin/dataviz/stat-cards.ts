import type { PageSection } from '~/business/cms/page.schema'
import type { ChartContent } from '~/components/pages/page/sections/chart-section'
import { adminDatavizCopy } from '~/copy/admin/dataviz'

export type StatsContent = Extract<PageSection, { _type: 'statsSection' }>
export type StatCard = StatsContent['cards'][number]
type Unit = StatCard['unit']

export const stat = (_key: string, value: number, caption: string, unit: Unit = 'none'): StatCard => ({
  _type: 'statNumber',
  _key,
  value,
  caption,
  unit,
})

export const statsGroup = (_key: string, title: string | null, cards: StatCard[]): StatsContent => ({
  _type: 'statsSection',
  _key,
  title,
  cards,
})

export const oneDecimal = (value: number) => Math.round(value * 10) / 10

export const percentOf = (part: number, total: number) =>
  total === 0 ? 0 : oneDecimal((100 * part) / total)

export const internalChart = (content: ChartContent): ChartContent => ({
  ...content,
  title: adminDatavizCopy.internal(content.title),
})
