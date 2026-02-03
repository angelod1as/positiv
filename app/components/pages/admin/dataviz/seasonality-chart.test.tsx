import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { EventAttendanceDataPoint } from '~/business/admin/dataviz/dataviz.types'
import { SeasonalityChart } from './seasonality-chart'

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

const mockData: EventAttendanceDataPoint[] = [
  {
    title: 'Corpus Peladus',
    emoji: '🎃',
    date: '2023-02-15',
    inscritos: 95,
    compareceram: 78,
    nao_foram: 10,
    will_not_go: 5,
    skipped: 2,
    rodizio: 15,
    vagas_sociais: 5,
    staff: 2,
  },
  {
    title: 'Positiv Julina',
    emoji: '🎊',
    date: '2023-07-20',
    inscritos: 102,
    compareceram: 85,
    nao_foram: 12,
    will_not_go: 3,
    skipped: 2,
    rodizio: 20,
    vagas_sociais: 8,
    staff: 3,
  },
  {
    title: 'Rolaween',
    emoji: '🎃',
    date: '2025-10-31',
    inscritos: 110,
    compareceram: 92,
    nao_foram: 8,
    will_not_go: 6,
    skipped: 4,
    rodizio: 18,
    vagas_sociais: 6,
    staff: 2,
  },
]

describe('SeasonalityChart', () => {
  it('renders with mock data', () => {
    const { container } = render(<SeasonalityChart data={mockData} />)
    expect(container.querySelector('[data-chart]')).toBeInTheDocument()
  })

  it('handles empty data gracefully', () => {
    const { container } = render(<SeasonalityChart data={[]} />)
    expect(container.querySelector('[data-chart]')).toBeInTheDocument()
  })

  it('configures inscritos and compareceram in chart config', () => {
    const { container } = render(<SeasonalityChart data={mockData} />)
    const styleTag = container.querySelector('style')
    expect(styleTag).toBeInTheDocument()
    expect(styleTag?.textContent).toContain('--color-inscritos')
    expect(styleTag?.textContent).toContain('--color-compareceram')
  })

  it('applies custom className prop', () => {
    const { container } = render(
      <SeasonalityChart data={mockData} className="custom-chart-class" />
    )
    expect(container.querySelector('[data-chart]')).toHaveClass('custom-chart-class')
  })

  it('has proper accessibility attributes', () => {
    const { container } = render(<SeasonalityChart data={mockData} />)
    const chart = container.querySelector('[data-chart]')
    expect(chart).toHaveAttribute('role', 'img')
    expect(chart).toHaveAttribute(
      'aria-label',
      'Análise de sazonalidade - inscrições e comparecimento ao longo do tempo'
    )
  })

  it('renders with horizontal scrolling wrapper', () => {
    const { container } = render(<SeasonalityChart data={mockData} />)
    const scrollWrapper = container.querySelector('.overflow-x-auto')
    expect(scrollWrapper).toBeInTheDocument()
  })

  it('displays footer note with event count and years span', () => {
    render(<SeasonalityChart data={mockData} />)
    expect(screen.getByText(/Baseado em 3 eventos/)).toBeInTheDocument()
    expect(screen.getByText(/ao longo de 3 anos/)).toBeInTheDocument()
  })

  it('calculates years span correctly for events in same year', () => {
    const sameYearData: EventAttendanceDataPoint[] = [
      { ...mockData[0], date: '2023-01-15' },
      { ...mockData[1], date: '2023-07-20' },
    ]
    render(<SeasonalityChart data={sameYearData} />)
    expect(screen.getByText(/ao longo de 1 ano/)).toBeInTheDocument()
  })

  it('calculates years span correctly for events across multiple years', () => {
    const multiYearData: EventAttendanceDataPoint[] = [
      { ...mockData[0], date: '2023-02-15' },
      { ...mockData[1], date: '2024-07-20' },
      { ...mockData[2], date: '2025-10-31' },
    ]
    render(<SeasonalityChart data={multiYearData} />)
    expect(screen.getByText(/ao longo de 3 anos/)).toBeInTheDocument()
  })

  it('handles invalid dates gracefully without returning NaN', () => {
    const invalidDateData: EventAttendanceDataPoint[] = [
      { ...mockData[0], date: 'invalid-date' },
      { ...mockData[1], date: '2024-07-20' },
    ]
    render(<SeasonalityChart data={invalidDateData} />)
    expect(screen.getByText(/ao longo de 1 ano/)).toBeInTheDocument()
  })

  it('shows zero years span when all dates are invalid', () => {
    const allInvalidData: EventAttendanceDataPoint[] = [
      { ...mockData[0], date: 'invalid-date' },
      { ...mockData[1], date: 'also-invalid' },
    ]
    render(<SeasonalityChart data={allInvalidData} />)
    expect(screen.getByText(/ao longo de 0 anos/)).toBeInTheDocument()
  })
})
