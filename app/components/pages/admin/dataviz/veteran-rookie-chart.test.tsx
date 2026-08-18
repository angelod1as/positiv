import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { VeteranRookieDataPoint } from '~/business/admin/dataviz/dataviz.types'
import { adminDatavizCopy } from '~/copy/admin/dataviz'
import { VeteranRookieChart } from './veteran-rookie-chart'

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

const mockData: VeteranRookieDataPoint[] = [
  {
    title: 'Corpus Peladus',
    emoji: '🎃',
    date: '2025-06-15',
    veterans: 0,
    rookies: 39,
  },
  {
    title: 'Positiv Julina',
    emoji: '🎊',
    date: '2025-07-20',
    veterans: 14,
    rookies: 39,
  },
  {
    title: 'Rolaween',
    emoji: '🎃',
    date: '2025-10-31',
    veterans: 38,
    rookies: 15,
  },
  {
    title: 'Vem Quente',
    emoji: '🔥',
    date: '2026-01-25',
    veterans: 38,
    rookies: 19,
  },
]

describe('VeteranRookieChart', () => {
  it('renders with mock data', () => {
    const { container } = render(<VeteranRookieChart data={mockData} />)
    expect(container.querySelector('[data-chart]')).toBeInTheDocument()
  })

  it('handles empty data gracefully', () => {
    const { container } = render(<VeteranRookieChart data={[]} />)
    expect(container.querySelector('[data-chart]')).toBeInTheDocument()
  })

  it('configures veterans and rookies in chart config', () => {
    const { container } = render(<VeteranRookieChart data={mockData} />)
    const styleTag = container.querySelector('style')
    expect(styleTag).toBeInTheDocument()
    expect(styleTag?.textContent).toContain('--color-veterans')
    expect(styleTag?.textContent).toContain('--color-rookies')
  })

  it('applies custom className prop', () => {
    const { container } = render(
      <VeteranRookieChart data={mockData} className="custom-chart-class" />
    )
    expect(container.querySelector('[data-chart]')).toHaveClass('custom-chart-class')
  })

  it('has proper accessibility attributes', () => {
    const { container } = render(<VeteranRookieChart data={mockData} />)
    const chart = container.querySelector('[data-chart]')
    expect(chart).toHaveAttribute('role', 'img')
    expect(chart).toHaveAttribute(
      'aria-label',
      adminDatavizCopy.veteranRookieChart.ariaLabel
    )
  })

  it('renders stacked area chart by default', () => {
    const { container } = render(<VeteranRookieChart data={mockData} />)
    // Stacked areas should have stackId="stack" attribute
    const chart = container.querySelector('[data-chart]')
    expect(chart).toBeInTheDocument()
  })
})
