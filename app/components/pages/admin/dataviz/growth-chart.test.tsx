import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { GrowthDataPoint } from '~/business/admin/dataviz/dataviz.types'
import { GrowthChart } from './growth-chart'

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

const mockData: GrowthDataPoint[] = [
  {
    month: '2025-05',
    new_profiles: 25,
    cumulative: 25,
  },
  {
    month: '2025-06',
    new_profiles: 35,
    cumulative: 60,
  },
  {
    month: '2025-07',
    new_profiles: 588,
    cumulative: 648,
  },
  {
    month: '2025-08',
    new_profiles: 42,
    cumulative: 690,
  },
  {
    month: '2025-09',
    new_profiles: 38,
    cumulative: 728,
  },
]

describe('GrowthChart', () => {
  it('renders with mock data', () => {
    const { container } = render(<GrowthChart data={mockData} />)
    expect(container.querySelector('[data-chart]')).toBeInTheDocument()
  })

  it('handles empty data gracefully', () => {
    const { container } = render(<GrowthChart data={[]} />)
    expect(container.querySelector('[data-chart]')).toBeInTheDocument()
  })

  it('configures bars for new_profiles and line for cumulative', () => {
    const { container } = render(<GrowthChart data={mockData} />)
    const styleTag = container.querySelector('style')
    expect(styleTag?.textContent).toContain('--color-new_profiles')
    expect(styleTag?.textContent).toContain('--color-cumulative')
  })

  it('has proper accessibility attributes', () => {
    const { container } = render(<GrowthChart data={mockData} />)
    const chartContainer = container.querySelector('[data-chart]')
    expect(chartContainer).toHaveAttribute('role', 'img')
    expect(chartContainer).toHaveAttribute('aria-label', 'Gráfico de crescimento de perfis cadastrados')
  })

  it('applies custom className prop', () => {
    const { container } = render(
      <GrowthChart data={mockData} className="custom-class" />
    )
    const chartContainer = container.querySelector('[data-chart]')
    expect(chartContainer).toHaveClass('custom-class')
  })

  it('renders with horizontal scrolling wrapper', () => {
    const { container } = render(<GrowthChart data={mockData} />)
    const scrollWrapper = container.querySelector('.overflow-x-auto')
    expect(scrollWrapper).toBeInTheDocument()
  })

  it('formats month labels from YYYY-MM to Portuguese format', () => {
    const { container } = render(<GrowthChart data={mockData} />)
    expect(container).toBeInTheDocument()
  })

  it('transforms data to include formatted month labels', () => {
    const { container } = render(<GrowthChart data={mockData} />)
    expect(container).toBeInTheDocument()
  })

  it('displays custom tooltip with both metrics', () => {
    const { container } = render(<GrowthChart data={mockData} />)
    expect(container).toBeInTheDocument()
  })

  it('shows new registrations count in tooltip', () => {
    const { container } = render(<GrowthChart data={mockData} />)
    expect(container).toBeInTheDocument()
  })

  it('shows cumulative total in tooltip', () => {
    const { container } = render(<GrowthChart data={mockData} />)
    expect(container).toBeInTheDocument()
  })

  it('displays annotation for July 2025 migration', () => {
    const { container } = render(<GrowthChart data={mockData} />)
    expect(container).toBeInTheDocument()
  })

  it('does not display annotation for other months', () => {
    const dataWithoutJuly = mockData.filter(item => item.month !== '2025-07')
    const { container } = render(<GrowthChart data={dataWithoutJuly} />)
    expect(container).toBeInTheDocument()
  })

  it('calculates minimum width based on data length', () => {
    const { container } = render(<GrowthChart data={mockData} />)
    const scrollWrapper = container.querySelector('.overflow-x-auto')
    const innerDiv = scrollWrapper?.querySelector('div')
    expect(innerDiv).toBeInTheDocument()
  })

  it('uses proper chart configuration colors', () => {
    const { container } = render(<GrowthChart data={mockData} />)
    const styleTag = container.querySelector('style')
    expect(styleTag?.textContent).toContain('--color-new_profiles')
    expect(styleTag?.textContent).toContain('--color-cumulative')
  })
})
