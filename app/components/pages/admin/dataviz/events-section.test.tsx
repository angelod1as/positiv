import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type {
  ConversionFunnelDataPoint,
  EventAttendanceDataPoint,
  EventRevenueDataPoint,
  OccupancyDataPoint,
  SeasonalityDataPoint,
  VeteranRookieDataPoint,
} from '~/business/admin/dataviz/dataviz.types'
import { adminDatavizCopy } from '~/copy/admin/dataviz'
import { render, screen, within } from '~/test/test-utils'
import { EventsSection } from './events-section'

vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts')
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div className="recharts-responsive-container" style={{ width: 500, height: 300 }}>
        {children}
      </div>
    ),
  }
})

const makeAttendance = (count: number): EventAttendanceDataPoint[] =>
  Array.from({ length: count }, (_, i) => ({
    title: `Evento ${i + 1}`,
    emoji: '🎉',
    date: `2024-0${i + 1}-15`,
    inscritos: 100 + i * 10,
    compareceram: 80 + i * 5,
    nao_foram: 10,
    withdrew: 5,
    not_selected: 2,
    skipped: 3,
    rodizio: 15,
    vagas_sociais: 5,
    staff: 2,
  }))

const makeRevenue = (count: number): EventRevenueDataPoint[] =>
  Array.from({ length: count }, (_, i) => ({
    title: `Evento ${i + 1}`,
    emoji: '🎉',
    date: `2024-0${i + 1}-15`,
    faturamento_total: 5000 + i * 1000,
    faturamento_bruto: 5200 + i * 1000,
    ticket_price: 5000,
    num_pagantes: 100 + i * 10,
  }))

const makeFunnel = (count: number): ConversionFunnelDataPoint[] =>
  Array.from({ length: count }, (_, i) => ({
    title: `Evento ${i + 1}`,
    emoji: '🎉',
    date: `2024-0${i + 1}-15`,
    inscritos: 100 + i * 10,
    finalizados: 90 + i * 5,
    pagaram: 80 + i * 5,
    compareceram: 70 + i * 5,
    pct_finalizados: 90,
    pct_pagaram: 80,
    pct_compareceram: 70,
  }))

const makeOccupancy = (count: number): OccupancyDataPoint[] =>
  Array.from({ length: count }, (_, i) => ({
    title: `Evento ${i + 1}`,
    emoji: '🎉',
    date: `2024-0${i + 1}-15`,
    compareceram: 80 + i * 5,
    total_spots: 100,
    occupancy_pct: 80 + i * 5,
  }))

const makeVeteranRookie = (count: number): VeteranRookieDataPoint[] =>
  Array.from({ length: count }, (_, i) => ({
    title: `Evento ${i + 1}`,
    emoji: '🎉',
    date: `2024-0${i + 1}-15`,
    veterans: 30 + i,
    rookies: 20 + i,
  }))

const seasonality: SeasonalityDataPoint[] = [
  { month_name: 'Março', avg_inscritos: 120, avg_compareceram: 80, avg_occupancy_pct: 70 },
]

const renderSection = (count: number) =>
  render(
    <EventsSection
      attendance={makeAttendance(count)}
      revenue={makeRevenue(count)}
      funnel={makeFunnel(count)}
      occupancy={makeOccupancy(count)}
      veteranRookie={makeVeteranRookie(count)}
      seasonality={seasonality}
    />
  )

const chartTitled = (title: string) => {
  const chart = screen.getByRole('heading', { level: 2, name: title }).closest('section')
  if (!chart) throw new Error(`No chart titled ${title}`)
  return within(chart)
}

describe('EventsSection', () => {
  it('renders the range selector when data has multiple events', () => {
    renderSection(5)

    expect(screen.getByText(adminDatavizCopy.eventRangeSelector.label)).toBeInTheDocument()
  })

  it('does not render the range selector for empty data', () => {
    renderSection(0)

    expect(screen.queryByText(adminDatavizCopy.eventRangeSelector.label)).not.toBeInTheDocument()
  })

  it('does not render the range selector for single event', () => {
    renderSection(1)

    expect(screen.queryByText(adminDatavizCopy.eventRangeSelector.label)).not.toBeInTheDocument()
  })

  it('draws every event chart as a Chart Section, in order', () => {
    renderSection(3)

    expect(
      screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)
    ).toEqual([
      'Eventos',
      'Presença por Evento',
      'Faturamento por Evento',
      'Preço do ingresso',
      'Funil de Conversão',
      'Conversão por Evento',
      'Ocupação',
      'Veteranes e Novates',
      'Sazonalidade',
    ])
  })

  it('opens every event in range as a table row', async () => {
    renderSection(3)

    const funnel = chartTitled('Conversão por Evento')
    await userEvent.click(funnel.getByRole('button', { name: 'Ver dados' }))

    expect(funnel.getAllByRole('rowheader').map((cell) => cell.textContent)).toEqual([
      '🎉 Evento 1 · 15/01/24',
      '🎉 Evento 2 · 15/02/24',
      '🎉 Evento 3 · 15/03/24',
    ])
  })

  it('keeps each chart to the selected events, even when one leaves an event out', async () => {
    localStorage.setItem('dataviz-brush-events', JSON.stringify({ startIndex: 0, endIndex: 1 }))
    const withoutTheSecond = makeVeteranRookie(3).filter((_, index) => index !== 1)
    render(
      <EventsSection
        attendance={makeAttendance(3)}
        revenue={makeRevenue(3)}
        funnel={makeFunnel(3)}
        occupancy={makeOccupancy(3)}
        veteranRookie={withoutTheSecond}
        seasonality={seasonality}
      />
    )
    localStorage.removeItem('dataviz-brush-events')

    const veterans = chartTitled('Veteranes e Novates')
    await userEvent.click(veterans.getByRole('button', { name: 'Ver dados' }))

    expect(veterans.getAllByRole('rowheader').map((cell) => cell.textContent)).toEqual([
      '🎉 Evento 1 · 15/01/24',
    ])
  })

  it('says so when there are no events to draw', () => {
    renderSection(0)

    expect(chartTitled('Ocupação').getByText('Nenhum dado disponível')).toBeInTheDocument()
  })
})
