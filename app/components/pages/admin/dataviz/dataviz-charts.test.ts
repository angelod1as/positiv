import { describe, expect, it } from 'vitest'
import type {
  ConversionFunnelDataPoint,
  EventAttendanceDataPoint,
  EventRevenueDataPoint,
  OccupancyDataPoint,
  VeteranRookieDataPoint,
} from '~/business/admin/dataviz/dataviz.types'
import {
  ageChart,
  attendanceChart,
  conversionChart,
  cumulativeGrowthChart,
  demographicChart,
  funnelChart,
  newProfilesChart,
  occupancyChart,
  retentionChart,
  revenueChart,
  seasonalityChart,
  ticketChart,
  veteranRookieChart,
} from './dataviz-charts'

const event = { title: 'Festa', emoji: '🎉', date: '2025-03-15' }
const rowsOf = (content: { rows: { label: string; values: number[] }[] }) =>
  content.rows.map(({ label, values }) => [label, ...values])

describe('demographicChart', () => {
  const data = [
    { category: 'Mulher cis', count: 60, percentage: 60 },
    { category: 'Homem cis', count: 38, percentage: 38 },
    { category: 'Agênero', count: 1, percentage: 1 },
    { category: 'Bigênero', count: 1, percentage: 1 },
  ]

  it('lays the share of each answer down, with its count in the label', () => {
    const content = demographicChart('gender', data)

    expect(content.chartType).toBe('horizontalBar')
    expect(content.unit).toBe('percent')
    expect(rowsOf(content)).toEqual([
      ['Mulher cis · 60', 60],
      ['Homem cis · 38', 38],
      ['Outros · 2', 2],
    ])
  })

  it('counts everyone who answered in the Resumo', () => {
    expect(demographicChart('gender', data).summary).toBe(
      'Distribuição de identidades de gênero na comunidade. 100 pessoas.',
    )
    expect(demographicChart('race', data).summary).toBe(
      'Distribuição de raça e cor na comunidade. Apenas 100 perfis preencheram este campo.',
    )
  })
})

describe('ageChart', () => {
  it('counts each age range in order, and how many profiles have a birth date', () => {
    const content = ageChart(
      [
        { category: '30-34', count: 10, percentage: 20 },
        { category: '18-24', count: 40, percentage: 80 },
      ],
      { filled: 50, total: 90 },
    )

    expect(content.chartType).toBe('horizontalBar')
    expect(rowsOf(content)).toEqual([
      ['18-24', 40],
      ['30-34', 10],
    ])
    expect(content.summary).toBe(
      'Distribuição de idades na comunidade. 50 perfis com data de nascimento preenchida (de 90 total).',
    )
  })
})

describe('retentionChart', () => {
  it('groups seven events and up, and totals everyone', () => {
    const content = retentionChart([
      { events_attended: 2, num_people: 30 },
      { events_attended: 1, num_people: 100 },
      { events_attended: 7, num_people: 4 },
      { events_attended: 9, num_people: 1 },
    ])

    expect(content.chartType).toBe('bar')
    expect(rowsOf(content)).toEqual([
      ['1', 100],
      ['2', 30],
      ['7+', 5],
    ])
    expect(content.summary).toBe(
      'Quantas pessoas participaram de N ou mais eventos. Total: 135 pessoas únicas.',
    )
  })

  it('leaves the 7+ bar out when nobody came that often', () => {
    expect(rowsOf(retentionChart([{ events_attended: 1, num_people: 10 }]))).toEqual([['1', 10]])
  })
})

describe('growth charts', () => {
  const growth = [
    { month: '2025-06', new_profiles: 10, cumulative: 10 },
    { month: '2025-07', new_profiles: 500, cumulative: 510 },
  ]

  it('draws the new profiles per month, the migration month highlighted', () => {
    const content = newProfilesChart(growth)

    expect(content.chartType).toBe('bar')
    expect(rowsOf(content)).toEqual([
      ['jun/25', 10],
      ['jul/25', 500],
    ])
    expect(content.rows.map((row) => row.highlight ?? false)).toEqual([false, true])
    expect(content.summary).toContain('Migração do sistema anterior')
  })

  it('leaves the migration out of the Resumo when the month is not drawn', () => {
    expect(newProfilesChart(growth.slice(0, 1)).summary).not.toContain('Migração')
  })

  it('draws the running total as a line', () => {
    const content = cumulativeGrowthChart(growth)

    expect(content.chartType).toBe('line')
    expect(rowsOf(content)).toEqual([
      ['jun/25', 10],
      ['jul/25', 510],
    ])
  })
})

describe('event charts', () => {
  const attendance: EventAttendanceDataPoint = {
    ...event,
    inscritos: 100,
    compareceram: 70,
    nao_foram: 5,
    withdrew: 3,
    not_selected: 10,
    skipped: 0,
    rodizio: 7,
    vagas_sociais: 4,
    staff: 6,
  }

  it('names each event by emoji, title and date', () => {
    expect(attendanceChart([attendance]).rows[0]?.label).toBe('🎉 Festa · 15/03/25')
  })

  it('draws every attendance series as a line', () => {
    const content = attendanceChart([attendance])

    expect(content.chartType).toBe('line')
    expect(content.series).toEqual([
      'Candidaturas',
      'Compareceram',
      'Não foram',
      'Desistiu',
      'Não selecionade',
      'Rodízio',
      'Vagas sociais',
      'Staff',
    ])
    expect(content.rows[0]?.values).toEqual([100, 70, 5, 3, 10, 7, 4, 6])
  })

  const revenue: EventRevenueDataPoint = {
    ...event,
    faturamento_total: 1200050,
    faturamento_bruto: 1300000,
    ticket_price: 15000,
    num_pagantes: 80,
  }

  it('draws net and gross revenue in reais', () => {
    const content = revenueChart([revenue])

    expect(content.unit).toBe('brl')
    expect(content.series).toEqual(['Faturamento líquido', 'Faturamento bruto'])
    expect(content.rows[0]?.values).toEqual([12000.5, 13000])
  })

  it('draws the ticket price beside the average paid per payer', () => {
    const content = ticketChart([revenue, { ...revenue, num_pagantes: 0 }])

    expect(content.chartType).toBe('line')
    expect(content.series).toEqual(['Preço do ingresso', 'Ticket médio'])
    expect(content.rows.map((row) => row.values)).toEqual([
      [150, 150.00625],
      [150, 0],
    ])
  })

  const funnel: ConversionFunnelDataPoint = {
    ...event,
    inscritos: 100,
    finalizados: 80,
    pagaram: 60,
    compareceram: 50,
    pct_finalizados: 80,
    pct_pagaram: 60,
    pct_compareceram: 50,
  }

  it('narrows the funnel step by step, summed over every event drawn', () => {
    const content = funnelChart([
      funnel,
      { ...funnel, inscritos: 300, finalizados: 200, pagaram: 140, compareceram: 130 },
    ])

    expect(content.chartType).toBe('horizontalBar')
    expect(rowsOf(content)).toEqual([
      ['Candidaturas · 100%', 400],
      ['Finalizados · 70%', 280],
      ['Pagaram · 50%', 200],
      ['Compareceram · 45%', 180],
    ])
  })

  it('counts no share when the funnel is empty', () => {
    expect(funnelChart([{ ...funnel, inscritos: 0 }]).rows[1]?.label).toBe('Finalizados · 0%')
    expect(funnelChart([]).rows).toEqual([])
  })

  it('draws the conversion of each step at each event, in percent', () => {
    const content = conversionChart([funnel])

    expect(content.chartType).toBe('line')
    expect(content.unit).toBe('percent')
    expect(content.series).toEqual(['Finalizados', 'Pagaram', 'Compareceram'])
    expect(content.rows[0]?.values).toEqual([80, 60, 50])
  })

  it('draws the occupancy in percent, with the average over every spot', () => {
    const occupancy: OccupancyDataPoint[] = [
      { ...event, compareceram: 50, total_spots: 100, occupancy_pct: 50 },
      { ...event, compareceram: 100, total_spots: 100, occupancy_pct: 100 },
    ]
    const content = occupancyChart(occupancy)

    expect(content.unit).toBe('percent')
    expect(rowsOf(content).map(([, value]) => value)).toEqual([50, 100])
    expect(content.summary).toBe(
      'Percentual de ocupação das vagas em cada evento. Média: 75%.',
    )
  })

  it('averages no occupancy when no event had spots', () => {
    expect(
      occupancyChart([{ ...event, compareceram: 0, total_spots: 0, occupancy_pct: 0 }]).summary,
    ).toBe('Percentual de ocupação das vagas em cada evento. Média: 0%.')
  })

  it('draws veterans beside rookies at each event', () => {
    const veteranRookie: VeteranRookieDataPoint = { ...event, veterans: 30, rookies: 20 }
    const content = veteranRookieChart([veteranRookie])

    expect(content.chartType).toBe('bar')
    expect(content.series).toEqual(['Veteranes', 'Novates'])
    expect(content.rows[0]?.values).toEqual([30, 20])
  })
})

describe('seasonalityChart', () => {
  it('draws the monthly averages of applications and attendance', () => {
    const content = seasonalityChart([
      { month_name: 'Março', avg_inscritos: 120, avg_compareceram: 80, avg_occupancy_pct: 70 },
    ])

    expect(content.chartType).toBe('bar')
    expect(content.series).toEqual(['Candidaturas', 'Compareceram'])
    expect(rowsOf(content)).toEqual([['Março', 120, 80]])
  })
})
