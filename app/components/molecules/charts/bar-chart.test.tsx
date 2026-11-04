import { render } from '@testing-library/react'
import { cloneElement, isValidElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { ChartConfig } from '~/components/ui/chart'
import { BarChart } from './bar-chart'

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
  it('handles empty data without errors', () => {
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

  it('supports stacked bars', () => {
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

  it('supports horizontal orientation', () => {
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

describe('BarChart drawing', () => {
  const revenue = [{ dataKey: 'revenue' }]
  const bars = (container: HTMLElement) =>
    container.querySelectorAll('.recharts-bar-rectangle path')

  it('grows the bars in on first render by default', () => {
    const { container } = render(
      <BarChart data={mockData} config={mockConfig} series={revenue} xAxisKey="event" />
    )
    expect(bars(container)).toHaveLength(0)
  })

  it('draws every bar at once when animation is off', () => {
    const { container } = render(
      <BarChart
        data={mockData}
        config={mockConfig}
        series={revenue}
        xAxisKey="event"
        animated={false}
      />
    )
    expect(bars(container)).toHaveLength(3)
  })

  it('writes the value axis with the value formatter', () => {
    const { getByText } = render(
      <BarChart
        data={mockData}
        config={mockConfig}
        series={revenue}
        xAxisKey="event"
        animated={false}
        valueFormatter={(value) => `R$ ${value}`}
      />
    )
    expect(getByText('R$ 8000')).toBeInTheDocument()
  })

  it('writes the value axis of a horizontal chart with the value formatter', () => {
    const { getByText } = render(
      <BarChart
        data={mockData}
        config={mockConfig}
        series={revenue}
        xAxisKey="event"
        horizontal
        animated={false}
        valueFormatter={(value) => `R$ ${value}`}
      />
    )
    expect(getByText('R$ 8000')).toBeInTheDocument()
  })

  it('colours a single bar from the series cell colours', () => {
    const { container } = render(
      <BarChart
        data={mockData}
        config={mockConfig}
        series={[
          {
            dataKey: 'revenue',
            cellColors: [undefined, 'var(--chart-highlight)', undefined],
          },
        ]}
        xAxisKey="event"
        animated={false}
      />
    )
    const fills = Array.from(bars(container)).map((bar) =>
      bar.getAttribute('fill')
    )
    expect(fills).toEqual([
      'var(--color-revenue)',
      'var(--chart-highlight)',
      'var(--color-revenue)',
    ])
  })
})

describe('BarChart category axis', () => {
  const categoryTicks = (container: HTMLElement) =>
    Array.from(
      container.querySelectorAll('.recharts-yAxis-tick-labels tspan')
    ).map((tick) => Number(tick.getAttribute('x')))

  it('gives a horizontal chart’s labels the width it is asked for', () => {
    const narrow = render(
      <BarChart
        data={mockData}
        config={mockConfig}
        series={[{ dataKey: 'revenue' }]}
        xAxisKey="event"
        horizontal
        animated={false}
      />
    )
    const wide = render(
      <BarChart
        data={mockData}
        config={mockConfig}
        series={[{ dataKey: 'revenue' }]}
        xAxisKey="event"
        horizontal
        animated={false}
        categoryAxisWidth={160}
      />
    )

    expect(categoryTicks(wide.container)[0]).toBe(
      categoryTicks(narrow.container)[0] + 100
    )
  })
})
