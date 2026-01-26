import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { EventAttendanceDataPoint } from '~/business/admin/dataviz/dataviz.types'
import { AttendanceChart } from './attendance-chart'

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
    title: 'Evento Teste 1',
    emoji: '🎉',
    date: '2024-01-15',
    inscritos: 100,
    compareceram: 80,
    nao_foram: 10,
    will_not_go: 5,
    skipped: 3,
    rodizio: 15,
    vagas_sociais: 5,
    staff: 2,
  },
  {
    title: 'Evento Teste 2',
    emoji: '🎊',
    date: '2024-02-15',
    inscritos: 120,
    compareceram: 90,
    nao_foram: 15,
    will_not_go: 8,
    skipped: 5,
    rodizio: 20,
    vagas_sociais: 10,
    staff: 3,
  },
]

describe('AttendanceChart', () => {
  it('renders with mock data', () => {
    const { container } = render(<AttendanceChart data={mockData} />)
    expect(container.querySelector('[data-chart]')).toBeInTheDocument()
  })

  it('handles empty data gracefully', () => {
    const { container } = render(<AttendanceChart data={[]} />)
    expect(container.querySelector('[data-chart]')).toBeInTheDocument()
  })

  it('configures all 7 series in chart config', () => {
    const { container } = render(<AttendanceChart data={mockData} />)
    const styleTag = container.querySelector('style')
    expect(styleTag).toBeInTheDocument()
    expect(styleTag?.textContent).toContain('--color-inscritos')
    expect(styleTag?.textContent).toContain('--color-compareceram')
    expect(styleTag?.textContent).toContain('--color-nao_foram')
    expect(styleTag?.textContent).toContain('--color-will_not_go')
    expect(styleTag?.textContent).toContain('--color-rodizio')
    expect(styleTag?.textContent).toContain('--color-vagas_sociais')
    expect(styleTag?.textContent).toContain('--color-staff')
  })

  it('applies custom className prop', () => {
    const { container } = render(
      <AttendanceChart data={mockData} className="custom-chart-class" />
    )
    expect(container.querySelector('[data-chart]')).toHaveClass('custom-chart-class')
  })

  it('has proper accessibility attributes', () => {
    const { container } = render(<AttendanceChart data={mockData} />)
    const chart = container.querySelector('[data-chart]')
    expect(chart).toHaveAttribute('role', 'img')
    expect(chart).toHaveAttribute('aria-label', 'Presença por evento')
  })

  it('renders legend items for all series', () => {
    render(<AttendanceChart data={mockData} />)
    expect(screen.getByText('Inscritos')).toBeInTheDocument()
    expect(screen.getByText('Compareceram')).toBeInTheDocument()
    expect(screen.getByText('Não foram')).toBeInTheDocument()
    expect(screen.getByText('Avisaram')).toBeInTheDocument()
    expect(screen.getByText('Rodízio')).toBeInTheDocument()
    expect(screen.getByText('Vagas sociais')).toBeInTheDocument()
    expect(screen.getByText('Staff')).toBeInTheDocument()
  })

  it('allows toggling series visibility via legend click', async () => {
    const user = userEvent.setup()
    render(<AttendanceChart data={mockData} />)

    const inscritosLegend = screen.getByText('Inscritos')
    await user.click(inscritosLegend)

    // After clicking, the series should be visually hidden (opacity reduced)
    const legendItem = inscritosLegend.closest('[data-legend-item]')
    expect(legendItem).toHaveAttribute('data-hidden', 'true')
  })

  it('renders with horizontal scrolling wrapper', () => {
    const { container } = render(<AttendanceChart data={mockData} />)
    const scrollWrapper = container.querySelector('.overflow-x-auto')
    expect(scrollWrapper).toBeInTheDocument()
  })
})
