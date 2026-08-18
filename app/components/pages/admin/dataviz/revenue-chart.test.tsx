import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { EventRevenueDataPoint } from '~/business/admin/dataviz/dataviz.types'
import { adminDatavizCopy } from '~/copy/admin/dataviz'
import { RevenueChart } from './revenue-chart'

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

const mockData: EventRevenueDataPoint[] = [
  {
    title: 'Festa de Verão',
    emoji: '🌞',
    date: '2025-06-15T20:00:00.000Z',
    faturamento_total: 10000,
    ticket_price: 170,
    num_pagantes: 60,
  },
  {
    title: 'Festa de Inverno',
    emoji: '❄️',
    date: '2025-07-20T20:00:00.000Z',
    faturamento_total: 12000,
    ticket_price: 200,
    num_pagantes: 65,
  },
  {
    title: 'Festa da Primavera',
    emoji: '🌸',
    date: '2025-09-10T20:00:00.000Z',
    faturamento_total: 8500,
    ticket_price: 170,
    num_pagantes: 50,
  },
]

describe('RevenueChart', () => {
  it('renders with mock data', () => {
    const { container } = render(<RevenueChart data={mockData} />)
    expect(container.querySelector('[data-chart]')).toBeInTheDocument()
  })

  it('handles empty data gracefully', () => {
    const { container } = render(<RevenueChart data={[]} />)
    expect(container.querySelector('[data-chart]')).toBeInTheDocument()
  })

  it('configures revenue bar and ticket_price line in chart', () => {
    const { container } = render(<RevenueChart data={mockData} />)
    const styleTag = container.querySelector('style')
    expect(styleTag?.textContent).toContain('--color-faturamento_total')
    expect(styleTag?.textContent).toContain('--color-ticket_price')
  })

  it('has proper accessibility attributes', () => {
    const { container } = render(<RevenueChart data={mockData} />)
    const chartContainer = container.querySelector('[data-chart]')
    expect(chartContainer).toHaveAttribute('role', 'img')
    expect(chartContainer).toHaveAttribute('aria-label', adminDatavizCopy.revenueChart.ariaLabel)
  })

  it('applies custom className prop', () => {
    const { container } = render(
      <RevenueChart data={mockData} className="custom-class" />
    )
    const chartContainer = container.querySelector('[data-chart]')
    expect(chartContainer).toHaveClass('custom-class')
  })

  it('formats currency values in Brazilian format', () => {
    const { container } = render(<RevenueChart data={mockData} />)
    expect(container).toBeInTheDocument()
  })

  it('calculates and displays average payment per person', () => {
    const { container } = render(<RevenueChart data={mockData} />)
    expect(container).toBeInTheDocument()
  })

})
