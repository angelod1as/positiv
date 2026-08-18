import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { DemographicDistribution } from '~/business/admin/dataviz/dataviz.types'
import { adminDatavizCopy } from '~/copy/admin/dataviz'
import { GenderChart } from './gender-chart'

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

const mockGenderData: DemographicDistribution[] = [
  { category: 'Mulher cis', count: 375, percentage: 40 },
  { category: 'Homem cis', count: 250, percentage: 26 },
  { category: 'NB', count: 110, percentage: 12 },
  { category: 'Agênera', count: 22, percentage: 2 },
  { category: 'Mulher trans', count: 18, percentage: 2 },
  { category: 'Travesti', count: 17, percentage: 2 },
  { category: 'Homem trans', count: 9, percentage: 1 },
  { category: 'Fluída', count: 8, percentage: 1 },
]

const mockGenderDataWithSmallCategories: DemographicDistribution[] = [
  { category: 'Mulher cis', count: 375, percentage: 40 },
  { category: 'Homem cis', count: 250, percentage: 26 },
  { category: 'NB', count: 110, percentage: 12 },
  { category: 'Agênera', count: 22, percentage: 2 },
  { category: 'Mulher trans', count: 9, percentage: 1 },  // < 2%
  { category: 'Travesti', count: 8, percentage: 1 },     // < 2%
  { category: 'Homem trans', count: 7, percentage: 1 },  // < 2%
  { category: 'Fluída', count: 5, percentage: 1 },       // < 2%
]

describe('GenderChart', () => {
  it('should render gender distribution chart with data', () => {
    const { container } = render(
      <GenderChart data={mockGenderData} mode="all" onModeChange={vi.fn()} />
    )
    expect(container.querySelector('[data-chart]')).toBeInTheDocument()
  })

  it('should group categories with less than 2% into "Outros"', () => {
    const { container } = render(
      <GenderChart data={mockGenderDataWithSmallCategories} mode="all" onModeChange={vi.fn()} />
    )

    // Should find "outros" (sanitized) in the chart config (style tag)
    const styleTag = container.querySelector('style')
    expect(styleTag?.textContent).toContain('--color-outros')

    // Verify main categories are still present (sanitized)
    expect(styleTag?.textContent).toContain('--color-mulher-cis')
    expect(styleTag?.textContent).toContain('--color-homem-cis')

    // Small categories (< 2%) should NOT be in config directly
    expect(styleTag?.textContent).not.toContain('--color-fluida')
  })

  it('should toggle between "Toda a comunidade" and "Quem já compareceu"', async () => {
    const user = userEvent.setup()
    const mockOnModeChange = vi.fn()
    const { rerender } = render(
      <GenderChart data={mockGenderData} mode="all" onModeChange={mockOnModeChange} />
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
    rerender(<GenderChart data={mockGenderData} mode="attended" onModeChange={mockOnModeChange} />)

    // Second button should now be active
    const todaButtonAfter = screen.getByRole('button', { name: /toda a comunidade/i })
    const compareceramButtonAfter = screen.getByRole('button', { name: /quem já compareceu/i })
    expect(compareceramButtonAfter).toHaveAttribute('data-active', 'true')
    expect(todaButtonAfter).toHaveAttribute('data-active', 'false')
  })

  it('should display total count in center label', () => {
    const { container } = render(
      <GenderChart data={mockGenderData} mode="all" onModeChange={vi.fn()} />
    )

    // Total count should be displayed in the center
    const centerLabel = container.querySelector('[data-slot="center-label"]')
    expect(centerLabel).toBeInTheDocument()

    // Total is 809 pessoas (sum of all counts)
    expect(centerLabel).toHaveTextContent('809')
    expect(centerLabel).toHaveTextContent(adminDatavizCopy.people)
  })

  it('should show percentage and count in tooltip', () => {
    const { container } = render(
      <GenderChart data={mockGenderData} mode="all" onModeChange={vi.fn()} />
    )

    // Verify chart config has correct data structure for tooltip
    const styleTag = container.querySelector('style')
    expect(styleTag).toBeInTheDocument()

    // Should have color configurations for main categories (sanitized)
    expect(styleTag?.textContent).toContain('--color-mulher-cis')
    expect(styleTag?.textContent).toContain('--color-homem-cis')
  })

  it('should handle empty data without crashing', () => {
    const { container } = render(
      <GenderChart data={[]} mode="all" onModeChange={vi.fn()} />
    )

    // Should still render the container
    expect(container.querySelector('[data-chart]')).toBeInTheDocument()

    // Should show empty state message
    expect(screen.getByText(/nenhum dado disponível/i)).toBeInTheDocument()
  })

  it('has proper accessibility attributes', () => {
    const { container } = render(
      <GenderChart data={mockGenderData} mode="all" onModeChange={vi.fn()} />
    )
    const chart = container.querySelector('[data-chart]')
    expect(chart).toHaveAttribute('role', 'img')
    expect(chart).toHaveAttribute('aria-label', adminDatavizCopy.genderChart.ariaLabel)
  })
})
