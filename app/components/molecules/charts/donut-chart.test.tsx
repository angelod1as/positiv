import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ChartConfig } from '~/components/ui/chart'
import { DonutChart } from './donut-chart'

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
  { gender: 'Male', count: 450 },
  { gender: 'Female', count: 400 },
  { gender: 'Other', count: 95 },
]

const mockConfig: ChartConfig = {
  Male: { label: 'Masculino', color: 'var(--chart-1)' },
  Female: { label: 'Feminino', color: 'var(--chart-2)' },
  Other: { label: 'Outro', color: 'var(--chart-3)' },
}

describe('DonutChart', () => {
  it('handles empty data without errors', () => {
    const { container } = render(
      <DonutChart
        data={[]}
        config={mockConfig}
        dataKey="count"
        nameKey="gender"
      />
    )
    expect(container.querySelector('[data-chart]')).toBeInTheDocument()
  })

  it('renders center label when provided', () => {
    render(
      <DonutChart
        data={mockData}
        config={mockConfig}
        dataKey="count"
        nameKey="gender"
        centerLabel={<span data-testid="center-label">945</span>}
      />
    )
    expect(screen.getByTestId('center-label')).toBeInTheDocument()
    expect(screen.getByTestId('center-label')).toHaveTextContent('945')
  })

  it('does not render center label when not provided', () => {
    const { container } = render(
      <DonutChart
        data={mockData}
        config={mockConfig}
        dataKey="count"
        nameKey="gender"
      />
    )
    expect(container.querySelector('[data-slot="center-label"]')).not.toBeInTheDocument()
  })
})
