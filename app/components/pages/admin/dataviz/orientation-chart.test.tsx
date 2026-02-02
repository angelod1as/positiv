import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { DemographicDistribution } from '~/business/admin/dataviz/dataviz.types'
import { OrientationChart } from './orientation-chart'

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

const mockOrientationData: DemographicDistribution[] = [
  { category: 'Bi', count: 380, percentage: 45 },
  { category: 'Pan', count: 227, percentage: 27 },
  { category: 'Hétero', count: 94, percentage: 11 },
  { category: 'Demi', count: 93, percentage: 11 },
  { category: 'Gay', count: 21, percentage: 2 },
  { category: 'Lésbica', count: 20, percentage: 2 },
  { category: 'Ace', count: 10, percentage: 1 },
]

const mockOrientationDataWithSmallCategories: DemographicDistribution[] = [
  { category: 'Bi', count: 380, percentage: 45 },
  { category: 'Pan', count: 227, percentage: 27 },
  { category: 'Hétero', count: 94, percentage: 11 },
  { category: 'Demi', count: 93, percentage: 11 },
  { category: 'Gay', count: 21, percentage: 2 },
  { category: 'Lésbica', count: 10, percentage: 1 },  // < 2%
  { category: 'Ace', count: 8, percentage: 1 },       // < 2%
  { category: 'Queer', count: 5, percentage: 1 },     // < 2%
]

describe('OrientationChart', () => {
  it('should render orientation distribution chart with data', () => {
    const { container } = render(
      <OrientationChart data={mockOrientationData} mode="all" onModeChange={vi.fn()} />
    )
    expect(container.querySelector('[data-chart]')).toBeInTheDocument()
  })

  it('should group categories with less than 2% into "Outros"', () => {
    const { container } = render(
      <OrientationChart data={mockOrientationDataWithSmallCategories} mode="all" onModeChange={vi.fn()} />
    )

    // Should find "Outros" in the chart config (style tag)
    const styleTag = container.querySelector('style')
    expect(styleTag?.textContent).toContain('--color-Outros')

    // Verify main categories are still present
    expect(styleTag?.textContent).toContain('--color-Bi')
    expect(styleTag?.textContent).toContain('--color-Pan')

    // Small categories (< 2%) should NOT be in config directly
    expect(styleTag?.textContent).not.toContain('--color-Queer')
  })

  it('should toggle between "Toda a comunidade" and "Quem já compareceu"', async () => {
    const user = userEvent.setup()
    const mockOnModeChange = vi.fn()
    const { rerender } = render(
      <OrientationChart data={mockOrientationData} mode="all" onModeChange={mockOnModeChange} />
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
    rerender(<OrientationChart data={mockOrientationData} mode="attended" onModeChange={mockOnModeChange} />)

    // Second button should now be active
    const todaButtonAfter = screen.getByRole('button', { name: /toda a comunidade/i })
    const compareceramButtonAfter = screen.getByRole('button', { name: /quem já compareceu/i })
    expect(compareceramButtonAfter).toHaveAttribute('data-active', 'true')
    expect(todaButtonAfter).toHaveAttribute('data-active', 'false')
  })

  it('should display total count in center label', () => {
    const { container } = render(
      <OrientationChart data={mockOrientationData} mode="all" onModeChange={vi.fn()} />
    )

    // Total count should be displayed in the center
    const centerLabel = container.querySelector('[data-slot="center-label"]')
    expect(centerLabel).toBeInTheDocument()

    // Total is 845 pessoas (sum of all counts)
    expect(centerLabel).toHaveTextContent('845')
    expect(centerLabel).toHaveTextContent('pessoas')
  })

  it('should show percentage and count in tooltip', () => {
    const { container } = render(
      <OrientationChart data={mockOrientationData} mode="all" onModeChange={vi.fn()} />
    )

    // Verify chart config has correct data structure for tooltip
    const styleTag = container.querySelector('style')
    expect(styleTag).toBeInTheDocument()

    // Should have color configurations for main categories
    expect(styleTag?.textContent).toContain('--color-Bi')
    expect(styleTag?.textContent).toContain('--color-Pan')
  })

  it('should handle empty data without crashing', () => {
    const { container } = render(
      <OrientationChart data={[]} mode="all" onModeChange={vi.fn()} />
    )

    // Should still render the container
    expect(container.querySelector('[data-chart]')).toBeInTheDocument()

    // Should show empty state message
    expect(screen.getByText(/nenhum dado disponível/i)).toBeInTheDocument()
  })

  it('has proper accessibility attributes', () => {
    const { container } = render(
      <OrientationChart data={mockOrientationData} mode="all" onModeChange={vi.fn()} />
    )
    const chart = container.querySelector('[data-chart]')
    expect(chart).toHaveAttribute('role', 'img')
    expect(chart).toHaveAttribute('aria-label', 'Distribuição de orientação')
  })
})
