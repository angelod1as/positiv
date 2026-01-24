import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ChartConfig } from '~/components/ui/chart'
import { AreaChart } from './area-chart'

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
  { month: 'Jan', inscritos: 100, compareceram: 80 },
  { month: 'Feb', inscritos: 150, compareceram: 120 },
  { month: 'Mar', inscritos: 200, compareceram: 160 },
]

const mockConfig: ChartConfig = {
  inscritos: { label: 'Inscritos', color: 'var(--chart-1)' },
  compareceram: { label: 'Compareceram', color: 'var(--chart-2)' },
}

const mockSeries = [
  { dataKey: 'inscritos' },
  { dataKey: 'compareceram' },
]

describe('AreaChart', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <AreaChart
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
      <AreaChart
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
      <AreaChart
        data={mockData}
        config={mockConfig}
        series={mockSeries}
        xAxisKey="month"
        className="area-custom"
      />
    )
    expect(container.querySelector('[data-chart]')).toHaveClass('area-custom')
  })

  it('injects CSS variables for chart colors', () => {
    const { container } = render(
      <AreaChart
        data={mockData}
        config={mockConfig}
        series={mockSeries}
        xAxisKey="month"
      />
    )
    const styleTag = container.querySelector('style')
    expect(styleTag).toBeInTheDocument()
    expect(styleTag?.textContent).toContain('--color-inscritos')
    expect(styleTag?.textContent).toContain('--color-compareceram')
  })

  it('renders the recharts area chart', () => {
    const { container } = render(
      <AreaChart
        data={mockData}
        config={mockConfig}
        series={mockSeries}
        xAxisKey="month"
      />
    )
    expect(container.querySelector('.recharts-wrapper')).toBeInTheDocument()
  })

  it('supports stacked mode by default', () => {
    const { container } = render(
      <AreaChart
        data={mockData}
        config={mockConfig}
        series={mockSeries}
        xAxisKey="month"
      />
    )
    expect(container.querySelector('[data-chart]')).toBeInTheDocument()
  })

  it('supports non-stacked mode', () => {
    const { container } = render(
      <AreaChart
        data={mockData}
        config={mockConfig}
        series={mockSeries}
        xAxisKey="month"
        stacked={false}
      />
    )
    expect(container.querySelector('[data-chart]')).toBeInTheDocument()
  })
})
