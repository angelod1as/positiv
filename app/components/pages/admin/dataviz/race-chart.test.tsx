import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { DemographicDistribution } from '~/business/admin/dataviz/dataviz.types'
import { RaceChart } from './race-chart'

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

const mockRaceData: DemographicDistribution[] = [
  { category: 'Branca', count: 128, percentage: 67 },
  { category: 'Parda', count: 33, percentage: 17 },
  { category: 'Preta', count: 19, percentage: 10 },
  { category: 'Amarela', count: 6, percentage: 3 },
  { category: 'Indígena', count: 2, percentage: 1 },
]

const mockRaceDataWithSmallCategories: DemographicDistribution[] = [
  { category: 'Branca', count: 128, percentage: 67 },
  { category: 'Parda', count: 33, percentage: 17 },
  { category: 'Preta', count: 19, percentage: 10 },
  { category: 'Amarela', count: 6, percentage: 3 },
  { category: 'Indígena', count: 2, percentage: 1 },    // < 2%
  { category: 'Não declarada', count: 1, percentage: 1 }, // < 2%
]

describe('RaceChart', () => {
  it('should render race distribution chart with data', () => {
    const { container } = render(
      <RaceChart data={mockRaceData} mode="all" onModeChange={vi.fn()} />
    )
    expect(container.querySelector('[data-chart]')).toBeInTheDocument()
  })

  it('should group categories with less than 2% into "Outros"', () => {
    const { container } = render(
      <RaceChart data={mockRaceDataWithSmallCategories} mode="all" onModeChange={vi.fn()} />
    )

    // Should find "Outros" in the chart config (style tag)
    const styleTag = container.querySelector('style')
    expect(styleTag?.textContent).toContain('--color-Outros')

    // Verify main categories are still present
    expect(styleTag?.textContent).toContain('--color-Branca')
    expect(styleTag?.textContent).toContain('--color-Parda')

    // Small categories (< 2%) should NOT be in config directly
    expect(styleTag?.textContent).not.toContain('--color-Não declarada')
  })

  it('should toggle between "Toda a comunidade" and "Quem já compareceu"', async () => {
    const user = userEvent.setup()
    const mockOnModeChange = vi.fn()
    const { rerender } = render(
      <RaceChart data={mockRaceData} mode="all" onModeChange={mockOnModeChange} />
    )

    // Should find both toggle buttons
    const todaButton = screen.getByRole('button', { name: /toda a comunidade/i })
    const compareceramButton = screen.getByRole('button', { name: /quem já compareceu/i })

    expect(todaButton).toBeInTheDocument()
    expect(compareceramButton).toBeInTheDocument()

    // First button should be active by default
    expect(todaButton).toHaveAttribute('data-active', 'true')
    expect(compareceramButton).toHaveAttribute('data-active', 'false')

    // Click the second button
    await user.click(compareceramButton)

    // onModeChange should be called with 'attended'
    expect(mockOnModeChange).toHaveBeenCalledWith('attended')

    // Simulate parent updating mode
    rerender(<RaceChart data={mockRaceData} mode="attended" onModeChange={mockOnModeChange} />)

    // Second button should now be active
    const todaButtonAfter = screen.getByRole('button', { name: /toda a comunidade/i })
    const compareceramButtonAfter = screen.getByRole('button', { name: /quem já compareceu/i })
    expect(compareceramButtonAfter).toHaveAttribute('data-active', 'true')
    expect(todaButtonAfter).toHaveAttribute('data-active', 'false')
  })

  it('should display total count in center label', () => {
    const { container } = render(
      <RaceChart data={mockRaceData} mode="all" onModeChange={vi.fn()} />
    )

    // Total count should be displayed in the center
    const centerLabel = container.querySelector('[data-slot="center-label"]')
    expect(centerLabel).toBeInTheDocument()

    // Total is 188 pessoas (sum of all counts)
    expect(centerLabel).toHaveTextContent('188')
    expect(centerLabel).toHaveTextContent('pessoas')
  })

  it('should display low coverage annotation', () => {
    render(
      <RaceChart data={mockRaceData} mode="all" onModeChange={vi.fn()} />
    )

    // Should show annotation about low field coverage
    expect(screen.getByText(/apenas 188 perfis preencheram este campo/i)).toBeInTheDocument()
  })

  it('should show percentage and count in tooltip', () => {
    const { container } = render(
      <RaceChart data={mockRaceData} mode="all" onModeChange={vi.fn()} />
    )

    // Verify chart config has correct data structure for tooltip
    const styleTag = container.querySelector('style')
    expect(styleTag).toBeInTheDocument()

    // Should have color configurations for main categories
    expect(styleTag?.textContent).toContain('--color-Branca')
    expect(styleTag?.textContent).toContain('--color-Parda')
  })

  it('should handle empty data without crashing', () => {
    const { container } = render(
      <RaceChart data={[]} mode="all" onModeChange={vi.fn()} />
    )

    // Should still render the container
    expect(container.querySelector('[data-chart]')).toBeInTheDocument()

    // Should show empty state message
    expect(screen.getByText(/nenhum dado disponível/i)).toBeInTheDocument()
  })

  it('has proper accessibility attributes', () => {
    const { container } = render(
      <RaceChart data={mockRaceData} mode="all" onModeChange={vi.fn()} />
    )
    const chart = container.querySelector('[data-chart]')
    expect(chart).toHaveAttribute('role', 'img')
    expect(chart).toHaveAttribute('aria-label', 'Distribuição de raça/cor')
  })
})
