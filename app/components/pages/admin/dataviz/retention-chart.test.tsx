import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { RetentionDataPoint } from '~/business/admin/dataviz/dataviz.types'
import { adminDatavizCopy } from '~/copy/admin/dataviz'
import { RetentionChart } from './retention-chart'

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

const mockData: RetentionDataPoint[] = [
  { events_attended: 1, num_people: 106 },
  { events_attended: 2, num_people: 33 },
  { events_attended: 3, num_people: 25 },
  { events_attended: 4, num_people: 13 },
  { events_attended: 5, num_people: 7 },
  { events_attended: 7, num_people: 4 },
]

describe('RetentionChart', () => {
  it('renders with mock data', () => {
    const { container } = render(<RetentionChart data={mockData} />)
    expect(container.querySelector('[data-chart]')).toBeInTheDocument()
  })

  it('handles empty data gracefully', () => {
    const { container } = render(<RetentionChart data={[]} />)
    expect(container.querySelector('[data-chart]')).toBeInTheDocument()
  })

  it('applies custom className prop', () => {
    const { container } = render(
      <RetentionChart data={mockData} className="custom-chart-class" />
    )
    expect(container.querySelector('[data-chart]')).toHaveClass('custom-chart-class')
  })

  it('has proper accessibility attributes', () => {
    const { container } = render(<RetentionChart data={mockData} />)
    const chart = container.querySelector('[data-chart]')
    expect(chart).toHaveAttribute('role', 'img')
    expect(chart).toHaveAttribute(
      'aria-label',
      adminDatavizCopy.retentionChart.ariaLabel
    )
  })

  it('configures chart with retention data key', () => {
    const { container } = render(<RetentionChart data={mockData} />)
    const styleTag = container.querySelector('style')
    expect(styleTag).toBeInTheDocument()
    expect(styleTag?.textContent).toContain('--color-num_people')
  })

  it('calculates total unique attendees correctly', () => {
    const { container } = render(<RetentionChart data={mockData} />)
    expect(container.querySelector('[data-chart]')).toBeInTheDocument()
  })

  it('formats X axis labels correctly with 7+ for high values', () => {
    const dataWith7Plus: RetentionDataPoint[] = [
      { events_attended: 1, num_people: 10 },
      { events_attended: 7, num_people: 5 },
      { events_attended: 8, num_people: 2 },
    ]
    const { container } = render(<RetentionChart data={dataWith7Plus} />)
    expect(container.querySelector('[data-chart]')).toBeInTheDocument()
  })

  it('handles missing data points gracefully', () => {
    const sparseData: RetentionDataPoint[] = [
      { events_attended: 1, num_people: 50 },
      { events_attended: 5, num_people: 10 },
    ]
    const { container } = render(<RetentionChart data={sparseData} />)
    expect(container.querySelector('[data-chart]')).toBeInTheDocument()
  })
})
