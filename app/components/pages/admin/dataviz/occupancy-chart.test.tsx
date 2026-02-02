import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { OccupancyDataPoint } from '~/business/admin/dataviz/dataviz.types'
import { OccupancyChart } from './occupancy-chart'

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

const mockData: OccupancyDataPoint[] = [
  {
    title: 'Evento Teste 1',
    emoji: '🎉',
    date: '2024-01-15',
    compareceram: 48,
    total_spots: 60,
    occupancy_pct: 80,
  },
  {
    title: 'Evento Teste 2',
    emoji: '🎊',
    date: '2024-02-15',
    compareceram: 57,
    total_spots: 60,
    occupancy_pct: 95,
  },
]

describe('OccupancyChart', () => {
  it('handles empty data gracefully', () => {
    const { container } = render(<OccupancyChart data={[]} />)
    const chart = container.querySelector('[data-chart]')
    expect(chart).toBeInTheDocument()
    expect(chart).toHaveTextContent('Nenhum dado de ocupação disponível')
  })

  it('renders LineChart with occupancy data', () => {
    const { container } = render(<OccupancyChart data={mockData} />)
    expect(container.querySelector('[data-chart]')).toBeInTheDocument()

    const styleTag = container.querySelector('style')
    expect(styleTag).toBeInTheDocument()
    expect(styleTag?.textContent).toContain('--color-occupancy_pct')
  })

  it('has proper accessibility attributes', () => {
    const { container } = render(<OccupancyChart data={mockData} />)
    const chart = container.querySelector('[data-chart]')
    expect(chart).toHaveAttribute('role', 'img')
    expect(chart).toHaveAttribute('aria-label', 'Gráfico de taxa de ocupação por evento')
  })

  it('renders with horizontal scrolling wrapper', () => {
    const { container} = render(<OccupancyChart data={mockData} />)
    const scrollWrapper = container.querySelector('.overflow-x-auto')
    expect(scrollWrapper).toBeInTheDocument()
  })

  it('applies custom className prop', () => {
    const { container } = render(
      <OccupancyChart data={mockData} className="custom-chart-class" />
    )
    expect(container.querySelector('[data-chart]')).toHaveClass('custom-chart-class')
  })
})
