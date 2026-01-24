import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ChartConfig } from '~/components/ui/chart'
import { LineChart } from './line-chart'

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
  { month: 'Jan', desktop: 100, mobile: 50 },
  { month: 'Feb', desktop: 200, mobile: 80 },
  { month: 'Mar', desktop: 150, mobile: 60 },
]

const mockConfig: ChartConfig = {
  desktop: { label: 'Desktop', color: 'var(--chart-1)' },
  mobile: { label: 'Mobile', color: 'var(--chart-2)' },
}

const mockSeries = [
  { dataKey: 'desktop' },
  { dataKey: 'mobile' },
]

describe('LineChart', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <LineChart
        data={mockData}
        config={mockConfig}
        series={mockSeries}
        xAxisKey="month"
      />
    )
    expect(container.querySelector('[data-chart]')).toBeInTheDocument()
  })

  it('renders without crashing when data is empty', () => {
    const { container } = render(
      <LineChart
        data={[]}
        config={mockConfig}
        series={mockSeries}
        xAxisKey="month"
      />
    )
    expect(container.querySelector('[data-chart]')).toBeInTheDocument()
  })

  it('applies className prop', () => {
    const { container } = render(
      <LineChart
        data={mockData}
        config={mockConfig}
        series={mockSeries}
        xAxisKey="month"
        className="custom-chart-class"
      />
    )
    expect(container.querySelector('[data-chart]')).toHaveClass('custom-chart-class')
  })

  it('injects CSS variables for chart colors via style tag', () => {
    const { container } = render(
      <LineChart
        data={mockData}
        config={mockConfig}
        series={mockSeries}
        xAxisKey="month"
      />
    )
    const styleTag = container.querySelector('style')
    expect(styleTag).toBeInTheDocument()
    expect(styleTag?.textContent).toContain('--color-desktop')
    expect(styleTag?.textContent).toContain('--color-mobile')
  })

  it('accepts children without crashing', () => {
    const { container } = render(
      <LineChart
        data={mockData}
        config={mockConfig}
        series={mockSeries}
        xAxisKey="month"
      >
        <div data-testid="extension-slot">extra content</div>
      </LineChart>
    )
    expect(container.querySelector('[data-chart]')).toBeInTheDocument()
  })

  it('renders the recharts line chart', () => {
    const { container } = render(
      <LineChart
        data={mockData}
        config={mockConfig}
        series={mockSeries}
        xAxisKey="month"
      />
    )
    expect(container.querySelector('.recharts-wrapper')).toBeInTheDocument()
  })

  it('applies role="img" and aria-label for accessibility', () => {
    const { container } = render(
      <LineChart
        data={mockData}
        config={mockConfig}
        series={mockSeries}
        xAxisKey="month"
        ariaLabel="Monthly desktop and mobile visitors"
      />
    )
    const chart = container.querySelector('[data-chart]')
    expect(chart).toHaveAttribute('role', 'img')
    expect(chart).toHaveAttribute('aria-label', 'Monthly desktop and mobile visitors')
  })

  it('renders with role="img" even without ariaLabel', () => {
    const { container } = render(
      <LineChart
        data={mockData}
        config={mockConfig}
        series={mockSeries}
        xAxisKey="month"
      />
    )
    const chart = container.querySelector('[data-chart]')
    expect(chart).toHaveAttribute('role', 'img')
  })
})
