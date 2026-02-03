import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { KpiScores as KpiScoresData } from '~/business/admin/dataviz/dataviz.types'
import { KpiScores } from './kpi-scores'

const mockKpiData: KpiScoresData = {
  total_profiles: 945,
  total_veterans: 207,
  total_approved: 280,
  total_events_completed: 15,
  total_unique_attendees: 188,
  avg_attendance_per_event: 51,
  avg_occupancy_pct: 75,
  total_revenue: 74955,
  avg_revenue_per_event: 10708,
  avg_ticket_price: 125,
  total_flagged: 122,
  attended_3_plus: 49,
  attended_5_plus: 11,
  avg_no_show_rate: 5,
}

describe('KpiScores', () => {
  it('should render all score cards', () => {
    const { container } = render(<KpiScores data={mockKpiData} />)
    const cards = container.querySelectorAll('[data-slot="card"]')
    expect(cards.length).toBeGreaterThan(0)
  })

  it('should render ScoreGrid component', () => {
    const { container } = render(<KpiScores data={mockKpiData} />)
    expect(container.querySelector('.grid')).toBeInTheDocument()
  })

  it('should format total profiles count with Brazilian locale', () => {
    render(<KpiScores data={mockKpiData} />)
    expect(screen.getByText('945')).toBeInTheDocument()
  })

  it('should format veterans count with Brazilian locale', () => {
    render(<KpiScores data={mockKpiData} />)
    expect(screen.getByText('207')).toBeInTheDocument()
  })

  it('should format approved profiles count', () => {
    render(<KpiScores data={mockKpiData} />)
    expect(screen.getByText('280')).toBeInTheDocument()
  })

  it('should format total revenue as Brazilian currency', () => {
    render(<KpiScores data={mockKpiData} />)
    expect(screen.getByText('R$ 74.955,00')).toBeInTheDocument()
  })

  it('should format average revenue as Brazilian currency', () => {
    render(<KpiScores data={mockKpiData} />)
    expect(screen.getByText('R$ 10.708,00')).toBeInTheDocument()
  })

  it('should display unique attendees', () => {
    render(<KpiScores data={mockKpiData} />)
    expect(screen.getByText('188')).toBeInTheDocument()
  })

  it('should display average attendance', () => {
    render(<KpiScores data={mockKpiData} />)
    expect(screen.getByText('51')).toBeInTheDocument()
  })

  it('should display profiles who attended 3+ events', () => {
    render(<KpiScores data={mockKpiData} />)
    expect(screen.getByText('49')).toBeInTheDocument()
  })

  it('should display profiles who attended 5+ events', () => {
    render(<KpiScores data={mockKpiData} />)
    expect(screen.getByText('11')).toBeInTheDocument()
  })

  it('should display flagged profiles count', () => {
    render(<KpiScores data={mockKpiData} />)
    expect(screen.getByText('122')).toBeInTheDocument()
  })

  it('should display average no-show rate as percentage', () => {
    render(<KpiScores data={mockKpiData} />)
    expect(screen.getByText('5%')).toBeInTheDocument()
  })

  it('should render icons for each score card', () => {
    const { container } = render(<KpiScores data={mockKpiData} />)
    const icons = container.querySelectorAll('[data-slot="icon"]')
    expect(icons.length).toBeGreaterThan(0)
  })

  it('should group cards logically with section headers', () => {
    render(<KpiScores data={mockKpiData} />)
    expect(screen.getByRole('heading', { name: /comunidade/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /engajamento/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /receita/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /saúde/i })).toBeInTheDocument()
  })
})
