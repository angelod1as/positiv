import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { GenderWarning, OrientationWarning, VeteranBadge } from './badges'

describe('GenderWarning', () => {
  it('should highlight specified gender identities and handle case variations', () => {
    render(<GenderWarning genders={[
      'Mulher trans',
      'travesti',
      'Pessoa não-binária',
      'Mulher cis'
    ]} />)

    const transWoman = screen.getByText('Mulher trans')
    const travesti = screen.getByText('travesti')
    const nonBinary = screen.getByText('Pessoa não-binária')
    const cisWoman = screen.getByText('Mulher cis')

    expect(transWoman).toHaveClass('text-blue-700')
    expect(travesti).toHaveClass('text-blue-700')
    expect(nonBinary).toHaveClass('text-blue-700')
    expect(cisWoman).not.toHaveClass('text-blue-700')
  })

  it('should handle null and empty arrays', () => {
    const { container, rerender } = render(<GenderWarning genders={null} />)
    expect(container.firstChild).toBeNull()

    rerender(<GenderWarning genders={[]} />)
    expect(container.firstChild).toBeNull()
  })
})

describe('OrientationWarning', () => {
  it('should highlight specified orientations and handle case variations', () => {
    render(<OrientationWarning orientations={[
      'Hétero',
      'sapiosexual',
      'Gay',
      'Lésbica'
    ]} />)

    const hetero = screen.getByText('Hétero')
    const sapio = screen.getByText('sapiosexual')
    const gay = screen.getByText('Gay')
    const lesbian = screen.getByText('Lésbica')

    expect(hetero).toHaveClass('text-red-700')
    expect(sapio).toHaveClass('text-red-700')
    expect(gay).not.toHaveClass('text-red-700')
    expect(lesbian).not.toHaveClass('text-red-700')
  })
})

describe('VeteranBadge', () => {
  it('should display event count when provided', () => {
    const { rerender } = render(<VeteranBadge eventCount={5} />)
    expect(screen.getByText('Veterane')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()

    rerender(<VeteranBadge />)
    expect(screen.queryByText(/\d+/)).not.toBeInTheDocument()
  })

  it('should apply gradient colors based on event count ranges', () => {
    const { rerender } = render(<VeteranBadge eventCount={1} />)
    expect(screen.getByText('1')).toHaveClass('bg-indigo-100')

    rerender(<VeteranBadge eventCount={5} />)
    expect(screen.getByText('5')).toHaveClass('bg-indigo-500')

    rerender(<VeteranBadge eventCount={10} />)
    expect(screen.getByText('10')).toHaveClass('bg-indigo-700')
  })
})

