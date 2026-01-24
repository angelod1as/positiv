import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ChartConfig } from '~/components/ui/chart'
import { BarChart } from './bar-chart'

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

const mockData = [
  { event: 'Event A', revenue: 5000, tickets: 100 },
  { event: 'Event B', revenue: 8000, tickets: 200 },
  { event: 'Event C', revenue: 3000, tickets: 50 },
]

const mockConfig: ChartConfig = {
  revenue: { label: 'Revenue', color: 'var(--chart-1)' },
  tickets: { label: 'Tickets', color: 'var(--chart-2)' },
}

const mockSeries = [
  { dataKey: 'revenue' },
  { dataKey: 'tickets' },
]

describe('BarChart', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <BarChart
        data={mockData}
        config={mockConfig}
        series={mockSeries}
        xAxisKey="event"
      />
    )
    expect(container.querySelector('[data-chart]')).toBeInTheDocument()
  })

  it('renders without crashing when data is empty', () => {
    const { container } = render(
      <BarChart
        data={[]}
        config={mockConfig}
        series={mockSeries}
        xAxisKey="event"
      />
    )
    expect(container.querySelector('[data-chart]')).toBeInTheDocument()
  })

  it('applies className prop', () => {
    const { container } = render(
      <BarChart
        data={mockData}
        config={mockConfig}
        series={mockSeries}
        xAxisKey="event"
        className="bar-chart-custom"
      />
    )
    expect(container.querySelector('[data-chart]')).toHaveClass('bar-chart-custom')
  })

  it('injects CSS variables for chart colors', () => {
    const { container } = render(
      <BarChart
        data={mockData}
        config={mockConfig}
        series={mockSeries}
        xAxisKey="event"
      />
    )
    const styleTag = container.querySelector('style')
    expect(styleTag).toBeInTheDocument()
    expect(styleTag?.textContent).toContain('--color-revenue')
    expect(styleTag?.textContent).toContain('--color-tickets')
  })

  it('renders the recharts bar chart', () => {
    const { container } = render(
      <BarChart
        data={mockData}
        config={mockConfig}
        series={mockSeries}
        xAxisKey="event"
      />
    )
    expect(container.querySelector('.recharts-wrapper')).toBeInTheDocument()
  })

  it('accepts children for combo chart extensibility', () => {
    const { container } = render(
      <BarChart
        data={mockData}
        config={mockConfig}
        series={mockSeries}
        xAxisKey="event"
      >
        <div data-testid="line-overlay">overlay</div>
      </BarChart>
    )
    expect(container.querySelector('[data-chart]')).toBeInTheDocument()
  })

  it('supports stacked prop', () => {
    const { container } = render(
      <BarChart
        data={mockData}
        config={mockConfig}
        series={mockSeries}
        xAxisKey="event"
        stacked
      />
    )
    expect(container.querySelector('[data-chart]')).toBeInTheDocument()
  })

  it('supports horizontal prop', () => {
    const { container } = render(
      <BarChart
        data={mockData}
        config={mockConfig}
        series={mockSeries}
        xAxisKey="event"
        horizontal
      />
    )
    expect(container.querySelector('[data-chart]')).toBeInTheDocument()
  })
})
