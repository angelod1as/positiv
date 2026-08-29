import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type {
  ConversionFunnelDataPoint,
  EventAttendanceDataPoint,
  EventRevenueDataPoint,
  OccupancyDataPoint,
} from '~/business/admin/dataviz/dataviz.types'
import { adminDatavizCopy } from '~/copy/admin/dataviz'
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
    taxas: 200,
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

describe('EventsSection', () => {
  it('renders the range selector when data has multiple events', () => {
    render(
      <EventsSection
        attendance={makeAttendance(5)}
        revenue={makeRevenue(5)}
        funnel={makeFunnel(5)}
        occupancy={makeOccupancy(5)}
      />
    )

    expect(screen.getByText(adminDatavizCopy.eventRangeSelector.label)).toBeInTheDocument()
  })

  it('does not render the range selector for empty data', () => {
    render(
      <EventsSection
        attendance={[]}
        revenue={[]}
        funnel={[]}
        occupancy={[]}
      />
    )

    expect(screen.queryByText(adminDatavizCopy.eventRangeSelector.label)).not.toBeInTheDocument()
  })

  it('does not render the range selector for single event', () => {
    render(
      <EventsSection
        attendance={makeAttendance(1)}
        revenue={makeRevenue(1)}
        funnel={makeFunnel(1)}
        occupancy={makeOccupancy(1)}
      />
    )

    expect(screen.queryByText(adminDatavizCopy.eventRangeSelector.label)).not.toBeInTheDocument()
  })
})
