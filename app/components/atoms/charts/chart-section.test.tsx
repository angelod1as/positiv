import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ChartSection } from './chart-section'

describe('ChartSection', () => {
  it('renders title and description', () => {
    render(
      <ChartSection
        title="Presença por Evento"
        description="Evolução dos números."
      >
        <div>chart content</div>
      </ChartSection>,
    )

    expect(
      screen.getByRole('heading', { name: 'Presença por Evento' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Evolução dos números.')).toBeInTheDocument()
  })

  it('renders children', () => {
    render(
      <ChartSection title="Test" description="Desc">
        <div data-testid="child">chart</div>
      </ChartSection>,
    )

    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('renders inside a Card component', () => {
    const { container } = render(
      <ChartSection title="Test" description="Desc">
        <div>content</div>
      </ChartSection>,
    )

    expect(container.querySelector('[data-slot="card"]')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <ChartSection title="Test" description="Desc" className="custom-class">
        <div>content</div>
      </ChartSection>,
    )

    expect(container.querySelector('[data-slot="card"]')).toHaveClass(
      'custom-class',
    )
  })
})
