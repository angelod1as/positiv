import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ScrollableChartContainer } from './scrollable-chart-container'

describe('ScrollableChartContainer', () => {
  it('renders children inside a scrollable wrapper', () => {
    const { container } = render(
      <ScrollableChartContainer minWidth={1000}>
        <div data-testid="chart">chart</div>
      </ScrollableChartContainer>,
    )

    expect(screen.getByTestId('chart')).toBeInTheDocument()
    expect(container.querySelector('.overflow-x-auto')).toBeInTheDocument()
  })

  it('applies minWidth style to inner container', () => {
    const { container } = render(
      <ScrollableChartContainer minWidth={1500}>
        <div>chart</div>
      </ScrollableChartContainer>,
    )

    const innerDiv = container.querySelector('.overflow-x-auto > div')
    expect(innerDiv).toHaveStyle({ minWidth: '1500px' })
  })

  it('applies custom className', () => {
    const { container } = render(
      <ScrollableChartContainer minWidth={600} className="my-class">
        <div>chart</div>
      </ScrollableChartContainer>,
    )

    expect(container.firstChild).toHaveClass('my-class')
  })
})
