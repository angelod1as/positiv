import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MultiLineXAxisTick } from './multi-line-x-axis-tick'

describe('MultiLineXAxisTick', () => {
  it('renders two text lines from newline-separated value', () => {
    const { container } = render(
      <svg>
        <MultiLineXAxisTick
          x={100}
          y={200}
          payload={{ value: '🎉 Festa\n15/01/24' }}
        />
      </svg>,
    )

    const texts = container.querySelectorAll('text')
    expect(texts).toHaveLength(2)
    expect(texts[0].textContent).toBe('🎉 Festa')
    expect(texts[1].textContent).toBe('15/01/24')
  })

  it('renders single line when no newline', () => {
    const { container } = render(
      <svg>
        <MultiLineXAxisTick
          x={100}
          y={200}
          payload={{ value: 'Single line' }}
        />
      </svg>,
    )

    const texts = container.querySelectorAll('text')
    expect(texts).toHaveLength(2)
    expect(texts[0].textContent).toBe('Single line')
    expect(texts[1].textContent).toBe('')
  })

  it('returns null when payload is missing', () => {
    const { container } = render(
      <svg>
        <MultiLineXAxisTick x={100} y={200} />
      </svg>,
    )

    expect(container.querySelector('g')).not.toBeInTheDocument()
  })

  it('applies correct transform', () => {
    const { container } = render(
      <svg>
        <MultiLineXAxisTick
          x={50}
          y={75}
          payload={{ value: 'line1\nline2' }}
        />
      </svg>,
    )

    const g = container.querySelector('g')
    expect(g).toHaveAttribute('transform', 'translate(50,75)')
  })
})
