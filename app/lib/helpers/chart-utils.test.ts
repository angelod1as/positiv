import { describe, expect, it } from 'vitest'
import {
  formatChartDate,
  formatCurrency,
  buildEventLabel,
  calculateScrollWidth,
  groupSmallCategories,
  sanitizeCssKey,
  AGE_RANGE_ORDER,
  sortByAgeRange,
} from './chart-utils'

describe('formatChartDate', () => {
  it('formats ISO date string to dd/MM/yy', () => {
    expect(formatChartDate('2024-01-15')).toBe('15/01/24')
  })

  it('formats full ISO datetime string', () => {
    expect(formatChartDate('2024-12-25T10:30:00Z')).toBe('25/12/24')
  })

  it('returns original string when invalid date', () => {
    expect(formatChartDate('not-a-date')).toBe('not-a-date')
  })

  it('returns empty string for empty input', () => {
    expect(formatChartDate('')).toBe('')
  })
})

describe('formatCurrency', () => {
  it('formats number as BRL currency', () => {
    const result = formatCurrency(1500)
    expect(result).toContain('1.500')
    expect(result).toContain('R$')
  })

  it('formats zero', () => {
    const result = formatCurrency(0)
    expect(result).toContain('0')
    expect(result).toContain('R$')
  })

  it('formats decimal values', () => {
    const result = formatCurrency(99.99)
    expect(result).toContain('99,99')
  })
})

describe('buildEventLabel', () => {
  it('builds multi-line label with emoji, title, and formatted date', () => {
    const result = buildEventLabel({
      emoji: '🎉',
      title: 'Festa',
      date: '2024-01-15',
    })
    expect(result).toBe('🎉 Festa\n15/01/24')
  })

  it('handles missing emoji', () => {
    const result = buildEventLabel({
      emoji: '',
      title: 'Festa',
      date: '2024-01-15',
    })
    expect(result).toBe(' Festa\n15/01/24')
  })
})

describe('calculateScrollWidth', () => {
  it('returns minWidth based on data length and width per item', () => {
    expect(calculateScrollWidth(10, 100)).toBe(1000)
  })

  it('returns minimum threshold when calculated width is smaller', () => {
    expect(calculateScrollWidth(2, 100)).toBe(600)
  })

  it('uses custom minimum width', () => {
    expect(calculateScrollWidth(2, 100, 300)).toBe(300)
  })

  it('handles zero data length', () => {
    expect(calculateScrollWidth(0, 100)).toBe(600)
  })
})

describe('groupSmallCategories', () => {
  it('groups categories below threshold into Outros', () => {
    const data = [
      { category: 'A', count: 90, percentage: 90 },
      { category: 'B', count: 5, percentage: 5 },
      { category: 'C', count: 3, percentage: 3 },
      { category: 'D', count: 1, percentage: 1 },
      { category: 'E', count: 1, percentage: 1 },
    ]

    const result = groupSmallCategories(data)
    expect(result).toHaveLength(4) // A, B, C, Outros
    expect(result.find((r) => r.category === 'Outros')).toEqual({
      category: 'Outros',
      count: 2,
      percentage: 2,
    })
  })

  it('uses custom threshold', () => {
    const data = [
      { category: 'A', count: 90, percentage: 90 },
      { category: 'B', count: 5, percentage: 5 },
      { category: 'C', count: 3, percentage: 3 },
      { category: 'D', count: 2, percentage: 2 },
    ]

    const result = groupSmallCategories(data, 5)
    expect(result).toHaveLength(3) // A, B, Outros
    expect(result.find((r) => r.category === 'Outros')?.count).toBe(5)
  })

  it('returns data as-is when no categories are below threshold', () => {
    const data = [
      { category: 'A', count: 60, percentage: 60 },
      { category: 'B', count: 40, percentage: 40 },
    ]

    const result = groupSmallCategories(data)
    expect(result).toHaveLength(2)
    expect(result.find((r) => r.category === 'Outros')).toBeUndefined()
  })

  it('handles empty data', () => {
    expect(groupSmallCategories([])).toEqual([])
  })
})

describe('sanitizeCssKey', () => {
  it('replaces spaces with hyphens and lowercases', () => {
    expect(sanitizeCssKey('Mulher cisgênero')).toBe('mulher-cisgenero')
  })

  it('removes accents', () => {
    expect(sanitizeCssKey('Não-binário')).toBe('nao-binario')
  })

  it('removes special characters except hyphens', () => {
    expect(sanitizeCssKey('Raça/Cor (Brasil)')).toBe('racacor-brasil')
  })

  it('handles already-safe strings', () => {
    expect(sanitizeCssKey('outros')).toBe('outros')
  })

  it('handles empty string', () => {
    expect(sanitizeCssKey('')).toBe('')
  })

  it('collapses multiple hyphens', () => {
    expect(sanitizeCssKey('a   b---c')).toBe('a-b-c')
  })

  it('trims leading and trailing hyphens', () => {
    expect(sanitizeCssKey(' hello ')).toBe('hello')
  })
})

describe('AGE_RANGE_ORDER', () => {
  it('defines correct age range order', () => {
    expect(AGE_RANGE_ORDER).toEqual([
      '18-24',
      '25-29',
      '30-34',
      '35-39',
      '40-49',
      '50+',
    ])
  })
})

describe('sortByAgeRange', () => {
  it('sorts age range data in correct order', () => {
    const data = [
      { category: '50+', count: 5, percentage: 5 },
      { category: '18-24', count: 20, percentage: 20 },
      { category: '35-39', count: 15, percentage: 15 },
      { category: '25-29', count: 30, percentage: 30 },
      { category: '40-49', count: 10, percentage: 10 },
      { category: '30-34', count: 20, percentage: 20 },
    ]

    const result = sortByAgeRange(data)
    expect(result.map((r) => r.category)).toEqual([
      '18-24',
      '25-29',
      '30-34',
      '35-39',
      '40-49',
      '50+',
    ])
  })

  it('handles unknown age ranges by putting them at the end', () => {
    const data = [
      { category: '60+', count: 2, percentage: 2 },
      { category: '18-24', count: 20, percentage: 20 },
    ]

    const result = sortByAgeRange(data)
    expect(result.map((r) => r.category)).toEqual(['18-24', '60+'])
  })

  it('handles empty array', () => {
    expect(sortByAgeRange([])).toEqual([])
  })
})
