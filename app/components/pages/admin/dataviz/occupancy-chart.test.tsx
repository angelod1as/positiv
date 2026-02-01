import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { OccupancyDataPoint } from '~/business/admin/dataviz/dataviz.types'
import { OccupancyChart } from './occupancy-chart'

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

const mockData: OccupancyDataPoint[] = [
  {
    title: 'Evento Teste 1',
    emoji: '🎉',
    date: '2024-01-15',
    compareceram: 48,
    total_spots: 60,
    occupancy_pct: 80,
  },
  {
    title: 'Evento Teste 2',
    emoji: '🎊',
    date: '2024-02-15',
    compareceram: 57,
    total_spots: 60,
    occupancy_pct: 95,
  },
]

describe('OccupancyChart', () => {
  it('handles empty data gracefully', () => {
    const { container } = render(<OccupancyChart data={[]} />)
    expect(container.querySelector('[data-chart]')).toBeInTheDocument()
  })
})
