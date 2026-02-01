import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ConversionFunnelDataPoint } from '~/business/admin/dataviz/dataviz.types'
import { FunnelChart } from './funnel-chart'

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

const mockData: ConversionFunnelDataPoint[] = [
  {
    title: 'Evento Teste 1',
    emoji: '🎉',
    date: '2024-06-15',
    inscritos: 100,
    finalizados: 100,
    pagaram: 70,
    compareceram: 65,
    pct_finalizados: 100,
    pct_pagaram: 70,
    pct_compareceram: 65,
  },
  {
    title: 'Evento Teste 2',
    emoji: '🎊',
    date: '2024-07-15',
    inscritos: 120,
    finalizados: 115,
    pagaram: 85,
    compareceram: 78,
    pct_finalizados: 96,
    pct_pagaram: 71,
    pct_compareceram: 65,
  },
]

describe('FunnelChart', () => {
  it('renders with mock data', () => {
    const { container } = render(<FunnelChart data={mockData} />)
    expect(container.querySelector('[data-chart]')).toBeInTheDocument()
  })

  it('configures all 4 series in chart config', () => {
    const { container } = render(<FunnelChart data={mockData} />)
    const styleTag = container.querySelector('style')
    expect(styleTag).toBeInTheDocument()
    expect(styleTag?.textContent).toContain('--color-inscritos')
    expect(styleTag?.textContent).toContain('--color-finalizados')
    expect(styleTag?.textContent).toContain('--color-pagaram')
    expect(styleTag?.textContent).toContain('--color-compareceram')
  })

  it('handles empty data gracefully', () => {
    const { container } = render(<FunnelChart data={[]} />)
    expect(container.querySelector('[data-chart]')).toBeInTheDocument()
  })

  it('applies custom className prop', () => {
    const { container } = render(
      <FunnelChart data={mockData} className="custom-chart-class" />
    )
    expect(container.querySelector('[data-chart]')).toHaveClass('custom-chart-class')
  })

  it('has proper accessibility attributes', () => {
    const { container } = render(<FunnelChart data={mockData} />)
    const chart = container.querySelector('[data-chart]')
    expect(chart).toHaveAttribute('role', 'img')
    expect(chart).toHaveAttribute('aria-label', 'Funil de conversão por evento')
  })

  it('renders with horizontal scrolling wrapper', () => {
    const { container } = render(<FunnelChart data={mockData} />)
    const scrollWrapper = container.querySelector('.overflow-x-auto')
    expect(scrollWrapper).toBeInTheDocument()
  })
})
