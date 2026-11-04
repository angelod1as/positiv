import { render } from '@testing-library/react'
import { cloneElement, isValidElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { ChartConfig } from '~/components/ui/chart'
import { LineChart } from './line-chart'

vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts')
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div className="recharts-responsive-container" style={{ width: 500, height: 300 }}>
        {isValidElement<{ width?: number; height?: number }>(children)
          ? cloneElement(children, { width: 500, height: 300 })
          : children}
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
  it('handles empty data without errors', () => {
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

  it('accepts children for combo chart extensibility', () => {
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

  it('applies accessibility attributes', () => {
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
})

describe('LineChart drawing', () => {
  const desktop = [{ dataKey: 'desktop' }]

  it('draws the line out on first render by default', () => {
    const { container } = render(
      <LineChart data={mockData} config={mockConfig} series={desktop} xAxisKey="month" />
    )
    expect(container.querySelector('.recharts-line-curve')).toHaveAttribute('stroke-dasharray')
  })

  it('draws the whole line at once when animation is off', () => {
    const { container } = render(
      <LineChart
        data={mockData}
        config={mockConfig}
        series={desktop}
        xAxisKey="month"
        animated={false}
      />
    )
    expect(container.querySelector('.recharts-line-curve')).not.toHaveAttribute('stroke-dasharray')
  })

  it('writes the value axis with the value formatter', () => {
    const { getByText } = render(
      <LineChart
        data={mockData}
        config={mockConfig}
        series={desktop}
        xAxisKey="month"
        animated={false}
        valueFormatter={(value) => `${value}%`}
      />
    )
    expect(getByText('200%')).toBeInTheDocument()
  })
})

describe('LineChart keyboard layer', () => {
  it('keeps the keyboard out when the accessibility layer is off', () => {
    const { container } = render(
      <LineChart
        data={mockData}
        config={mockConfig}
        series={mockSeries}
        xAxisKey="month"
        accessibilityLayer={false}
      />
    )
    expect(container.querySelectorAll('[tabindex="0"]')).toHaveLength(0)
  })
})
