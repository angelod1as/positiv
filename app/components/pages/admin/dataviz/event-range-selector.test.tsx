import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { EventRangeSelector } from './event-range-selector'

vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts')
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div className="recharts-responsive-container" style={{ width: 500, height: 60 }}>
        {children}
      </div>
    ),
  }
})

const mockData = [
  { label: 'Evento 1', inscritos: 100 },
  { label: 'Evento 2', inscritos: 120 },
  { label: 'Evento 3', inscritos: 80 },
  { label: 'Evento 4', inscritos: 150 },
]

describe('EventRangeSelector', () => {
  it('renders chart container with brush for >1 data points', () => {
    const { container } = render(
      <EventRangeSelector
        data={mockData}
        startIndex={0}
        endIndex={3}
        onChange={vi.fn()}
      />
    )

    expect(container.querySelector('[data-chart]')).toBeInTheDocument()
  })

  it('returns null for empty data', () => {
    const { container } = render(
      <EventRangeSelector
        data={[]}
        startIndex={0}
        endIndex={-1}
        onChange={vi.fn()}
      />
    )

    expect(container.innerHTML).toBe('')
  })

  it('returns null for single item', () => {
    const { container } = render(
      <EventRangeSelector
        data={[{ label: 'Evento 1', inscritos: 100 }]}
        startIndex={0}
        endIndex={0}
        onChange={vi.fn()}
      />
    )

    expect(container.innerHTML).toBe('')
  })

  it('has proper aria-label', () => {
    const { container } = render(
      <EventRangeSelector
        data={mockData}
        startIndex={0}
        endIndex={3}
        onChange={vi.fn()}
      />
    )

    const chart = container.querySelector('[data-chart]')
    expect(chart).toHaveAttribute('aria-label', 'Selecionar intervalo de eventos')
  })

  it('displays the label text', () => {
    render(
      <EventRangeSelector
        data={mockData}
        startIndex={0}
        endIndex={3}
        onChange={vi.fn()}
      />
    )

    expect(screen.getByText('Selecionar intervalo de eventos')).toBeInTheDocument()
  })
})
