import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ScoreGrid } from './score-grid'

describe('ScoreGrid', () => {
  it('renders children', () => {
    render(
      <ScoreGrid>
        <div>Card 1</div>
        <div>Card 2</div>
      </ScoreGrid>
    )
    expect(screen.getByText('Card 1')).toBeInTheDocument()
    expect(screen.getByText('Card 2')).toBeInTheDocument()
  })

  it('renders as a grid container', () => {
    const { container } = render(
      <ScoreGrid>
        <div>Child</div>
      </ScoreGrid>
    )
    const grid = container.firstElementChild
    expect(grid).toHaveClass('grid')
  })

  it('has responsive grid column classes', () => {
    const { container } = render(
      <ScoreGrid>
        <div>Child</div>
      </ScoreGrid>
    )
    const grid = container.firstElementChild
    expect(grid).toHaveClass('grid-cols-1')
    expect(grid).toHaveClass('sm:grid-cols-2')
    expect(grid).toHaveClass('md:grid-cols-3')
    expect(grid).toHaveClass('lg:grid-cols-4')
  })

  it('applies custom className', () => {
    const { container } = render(
      <ScoreGrid className="custom-grid">
        <div>Child</div>
      </ScoreGrid>
    )
    const grid = container.firstElementChild
    expect(grid).toHaveClass('custom-grid')
  })
})
