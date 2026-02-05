import { format, isValid, parseISO } from 'date-fns'
import type { DemographicDistribution } from '~/business/admin/dataviz/dataviz.types'

export function formatChartDate(dateString: string): string {
  if (!dateString) return ''
  try {
    const date = parseISO(dateString)
    if (!isValid(date)) return dateString
    return format(date, 'dd/MM/yy')
  } catch {
    return dateString
  }
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function buildEventLabel({
  emoji,
  title,
  date,
}: {
  emoji: string
  title: string
  date: string
}): string {
  return `${emoji} ${title}\n${formatChartDate(date)}`
}

const DEFAULT_SMALL_CATEGORY_THRESHOLD = 2

export function groupSmallCategories(
  data: DemographicDistribution[],
  threshold: number = DEFAULT_SMALL_CATEGORY_THRESHOLD,
): DemographicDistribution[] {
  if (data.length === 0) return []

  const mainCategories: DemographicDistribution[] = []
  const smallCategories: DemographicDistribution[] = []

  for (const item of data) {
    if (item.percentage < threshold) {
      smallCategories.push(item)
    } else {
      mainCategories.push(item)
    }
  }

  if (smallCategories.length > 0) {
    const outrosCount = smallCategories.reduce(
      (sum, item) => sum + item.count,
      0,
    )
    const total = data.reduce((sum, item) => sum + item.count, 0)
    const outrosPercentage =
      total > 0 ? Math.round((outrosCount / total) * 100) : 0

    mainCategories.push({
      category: 'Outros',
      count: outrosCount,
      percentage: outrosPercentage,
    })
  }

  return mainCategories
}

export function sanitizeCssKey(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^a-z0-9-\s]/g, '') // remove special chars
    .replace(/\s+/g, '-') // spaces to hyphens
    .replace(/-+/g, '-') // collapse multiple hyphens
    .replace(/^-|-$/g, '') // trim hyphens
}

export const AGE_RANGE_ORDER = [
  '18-24',
  '25-29',
  '30-34',
  '35-39',
  '40-49',
  '50+',
] as const

export function sortByAgeRange(
  data: DemographicDistribution[],
): DemographicDistribution[] {
  return [...data].sort((a, b) => {
    const indexA = AGE_RANGE_ORDER.indexOf(
      a.category as (typeof AGE_RANGE_ORDER)[number],
    )
    const indexB = AGE_RANGE_ORDER.indexOf(
      b.category as (typeof AGE_RANGE_ORDER)[number],
    )
    const safeA = indexA === -1 ? AGE_RANGE_ORDER.length : indexA
    const safeB = indexB === -1 ? AGE_RANGE_ORDER.length : indexB
    return safeA - safeB
  })
}
