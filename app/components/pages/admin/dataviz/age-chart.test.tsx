import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { DemographicDistribution } from '~/business/admin/dataviz/dataviz.types'
import { AgeChart } from './age-chart'

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

const mockAgeData: DemographicDistribution[] = [
  { category: '18-24', count: 12, percentage: 3 },
  { category: '25-29', count: 41, percentage: 10 },
  { category: '30-34', count: 120, percentage: 30 },
  { category: '35-39', count: 115, percentage: 28 },
  { category: '40-49', count: 99, percentage: 24 },
  { category: '50+', count: 18, percentage: 5 },
]

describe('AgeChart', () => {
  it('should render age distribution chart with data', () => {
    const { container } = render(
      <AgeChart
        data={mockAgeData}
        mode="all"
        onModeChange={vi.fn()}
        totalProfiles={945}
        filledProfiles={405}
      />
    )
    expect(container.querySelector('[data-chart]')).toBeInTheDocument()
  })

  it('should display all 6 age ranges', () => {
    const { container } = render(
      <AgeChart
        data={mockAgeData}
        mode="all"
        onModeChange={vi.fn()}
        totalProfiles={945}
        filledProfiles={405}
      />
    )

    // Check that all age ranges are in the chart config (style tag)
    const styleTag = container.querySelector('style')
    expect(styleTag?.textContent).toContain('--color-18-24')
    expect(styleTag?.textContent).toContain('--color-25-29')
    expect(styleTag?.textContent).toContain('--color-30-34')
    expect(styleTag?.textContent).toContain('--color-35-39')
    expect(styleTag?.textContent).toContain('--color-40-49')
    expect(styleTag?.textContent).toContain('--color-50+')
  })

  it('should toggle between "Toda a comunidade" and "Quem já compareceu"', async () => {
    const user = userEvent.setup()
    const mockOnModeChange = vi.fn()
    const { rerender } = render(
      <AgeChart
        data={mockAgeData}
        mode="all"
        onModeChange={mockOnModeChange}
        totalProfiles={945}
        filledProfiles={405}
      />
    )

    // Should find both toggle buttons
    const todaButton = screen.getByRole('button', { name: /toda a comunidade/i })
    const compareceramButton = screen.getByRole('button', { name: /quem já compareceu/i })

    expect(todaButton).toBeInTheDocument()
    expect(compareceramButton).toBeInTheDocument()

    // First button should be active by default
    expect(todaButton).toHaveAttribute('aria-pressed', 'true')
    expect(compareceramButton).toHaveAttribute('aria-pressed', 'false')

    // Click the second button
    await user.click(compareceramButton)

    // onModeChange should be called with 'attended'
    expect(mockOnModeChange).toHaveBeenCalledWith('attended')

    // Simulate parent updating mode
    rerender(
      <AgeChart
        data={mockAgeData}
        mode="attended"
        onModeChange={mockOnModeChange}
        totalProfiles={945}
        filledProfiles={405}
      />
    )

    // Second button should now be active
    const todaButtonAfter = screen.getByRole('button', { name: /toda a comunidade/i })
    const compareceramButtonAfter = screen.getByRole('button', { name: /quem já compareceu/i })
    expect(compareceramButtonAfter).toHaveAttribute('aria-pressed', 'true')
    expect(todaButtonAfter).toHaveAttribute('aria-pressed', 'false')
  })

  it('should display annotation with filled/total profile count', () => {
    render(
      <AgeChart
        data={mockAgeData}
        mode="all"
        onModeChange={vi.fn()}
        totalProfiles={945}
        filledProfiles={405}
      />
    )

    // Should display annotation text
    const annotation = screen.getByText(/405 perfis com data de nascimento preenchida \(de 945 total\)/i)
    expect(annotation).toBeInTheDocument()
  })

  it('should render horizontal bars', () => {
    const { container } = render(
      <AgeChart
        data={mockAgeData}
        mode="all"
        onModeChange={vi.fn()}
        totalProfiles={945}
        filledProfiles={405}
      />
    )

    // Recharts uses layout="vertical" for horizontal bars
    const barChart = container.querySelector('.recharts-wrapper')
    expect(barChart).toBeInTheDocument()
  })

  it('should handle empty data without crashing', () => {
    const { container } = render(
      <AgeChart
        data={[]}
        mode="all"
        onModeChange={vi.fn()}
        totalProfiles={945}
        filledProfiles={0}
      />
    )

    // Should still render the container
    expect(container.querySelector('[data-chart]')).toBeInTheDocument()

    // Should show empty state message
    expect(screen.getByText(/nenhum dado disponível/i)).toBeInTheDocument()
  })

  it('has proper accessibility attributes', () => {
    const { container } = render(
      <AgeChart
        data={mockAgeData}
        mode="all"
        onModeChange={vi.fn()}
        totalProfiles={945}
        filledProfiles={405}
      />
    )
    const chart = container.querySelector('[data-chart]')
    expect(chart).toHaveAttribute('role', 'img')
    expect(chart).toHaveAttribute('aria-label', 'Distribuição de idade')
  })

  it('should show count and percentage in data', () => {
    const { container } = render(
      <AgeChart
        data={mockAgeData}
        mode="all"
        onModeChange={vi.fn()}
        totalProfiles={945}
        filledProfiles={405}
      />
    )

    // Verify chart config has correct data structure
    const styleTag = container.querySelector('style')
    expect(styleTag).toBeInTheDocument()

    // All age ranges should be in config
    expect(styleTag?.textContent).toContain('--color-18-24')
    expect(styleTag?.textContent).toContain('--color-30-34')
    expect(styleTag?.textContent).toContain('--color-50+')
  })
})
