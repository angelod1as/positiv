import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { GenderWarning, OrientationWarning, VeteranBadge, RookieBadge } from './badges'

describe('GenderWarning', () => {
  it('should highlight trans genders with blue color', () => {
    render(<GenderWarning genders={['Mulher trans', 'Homem trans']} />)
    
    const transWoman = screen.getByText('Mulher trans')
    const transMan = screen.getByText('Homem trans')
    
    expect(transWoman).toHaveClass('text-blue-700')
    expect(transMan).toHaveClass('text-blue-700')
  })

  it('should highlight agênera genders with blue color', () => {
    render(<GenderWarning genders={['Pessoa agênera']} />)
    
    const agender = screen.getByText('Pessoa agênera')
    expect(agender).toHaveClass('text-blue-700')
  })

  it('should highlight Travesti with blue color (case-insensitive)', () => {
    render(<GenderWarning genders={['Travesti', 'travesti', 'TRAVESTI']} />)
    
    const travesti1 = screen.getByText('Travesti')
    const travesti2 = screen.getByText('travesti')
    const travesti3 = screen.getByText('TRAVESTI')
    
    expect(travesti1).toHaveClass('text-blue-700')
    expect(travesti2).toHaveClass('text-blue-700')
    expect(travesti3).toHaveClass('text-blue-700')
  })

  it('should highlight não-binário variations with blue color', () => {
    render(<GenderWarning genders={[
      'Pessoa não binária',
      'Pessoa não-binária',
      'Pessoa não binarie',
      'Pessoa não-binarie',
      'Pessoa não binário',
      'não binária',
      'NÃO-BINÁRIO'
    ]} />)
    
    const variations = [
      screen.getByText('Pessoa não binária'),
      screen.getByText('Pessoa não-binária'),
      screen.getByText('Pessoa não binarie'),
      screen.getByText('Pessoa não-binarie'),
      screen.getByText('Pessoa não binário'),
      screen.getByText('não binária'),
      screen.getByText('NÃO-BINÁRIO')
    ]
    
    variations.forEach(element => {
      expect(element).toHaveClass('text-blue-700')
    })
  })

  it('should not highlight other genders', () => {
    render(<GenderWarning genders={['Mulher cis', 'Homem cis']} />)
    
    const cisgenderWoman = screen.getByText('Mulher cis')
    const cisgenderMan = screen.getByText('Homem cis')
    
    expect(cisgenderWoman).not.toHaveClass('text-blue-700')
    expect(cisgenderMan).not.toHaveClass('text-blue-700')
  })

  it('should render nothing when genders is null', () => {
    const { container } = render(<GenderWarning genders={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('should render nothing when genders is empty array', () => {
    const { container } = render(<GenderWarning genders={[]} />)
    expect(container.firstChild).toBeNull()
  })
})

describe('OrientationWarning', () => {
  it('should highlight Hétero with red color (case-insensitive)', () => {
    render(<OrientationWarning orientations={['Hétero', 'hétero', 'HÉTERO']} />)
    
    const hetero1 = screen.getByText('Hétero')
    const hetero2 = screen.getByText('hétero')
    const hetero3 = screen.getByText('HÉTERO')
    
    expect(hetero1).toHaveClass('text-red-700')
    expect(hetero2).toHaveClass('text-red-700')
    expect(hetero3).toHaveClass('text-red-700')
  })

  it('should highlight Sapiosexual with red color (case-insensitive)', () => {
    render(<OrientationWarning orientations={['Sapiosexual', 'sapiosexual', 'SAPIOSEXUAL']} />)
    
    const sapio1 = screen.getByText('Sapiosexual')
    const sapio2 = screen.getByText('sapiosexual')
    const sapio3 = screen.getByText('SAPIOSEXUAL')
    
    expect(sapio1).toHaveClass('text-red-700')
    expect(sapio2).toHaveClass('text-red-700')
    expect(sapio3).toHaveClass('text-red-700')
  })

  it('should not highlight other orientations', () => {
    render(<OrientationWarning orientations={['Gay', 'Lésbica', 'Bi', 'Pan', 'Demi', 'Ace']} />)
    
    const orientations = [
      screen.getByText('Gay'),
      screen.getByText('Lésbica'),
      screen.getByText('Bi'),
      screen.getByText('Pan'),
      screen.getByText('Demi'),
      screen.getByText('Ace')
    ]
    
    orientations.forEach(element => {
      expect(element).not.toHaveClass('text-red-700')
    })
  })

  it('should render nothing when orientations is null', () => {
    const { container } = render(<OrientationWarning orientations={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('should render nothing when orientations is empty array', () => {
    const { container } = render(<OrientationWarning orientations={[]} />)
    expect(container.firstChild).toBeNull()
  })
})

describe('VeteranBadge with event count', () => {
  it('should render badge without count when eventCount is undefined', () => {
    render(<VeteranBadge />)
    expect(screen.getByText('Veterane')).toBeInTheDocument()
    expect(screen.queryByText(/\d+/)).not.toBeInTheDocument()
  })

  it('should render badge without count when eventCount is null', () => {
    render(<VeteranBadge eventCount={null} />)
    expect(screen.getByText('Veterane')).toBeInTheDocument()
    expect(screen.queryByText(/\d+/)).not.toBeInTheDocument()
  })

  it('should render badge with count of 0', () => {
    render(<VeteranBadge eventCount={0} />)
    expect(screen.getByText('Veterane')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('should render badge with single digit count', () => {
    render(<VeteranBadge eventCount={5} />)
    expect(screen.getByText('Veterane')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('should render badge with double-digit count', () => {
    render(<VeteranBadge eventCount={12} />)
    expect(screen.getByText('Veterane')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
  })

  it('should render badge with triple-digit count', () => {
    render(<VeteranBadge eventCount={100} />)
    expect(screen.getByText('Veterane')).toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument()
  })
})

describe('RookieBadge', () => {
  it('should render Novate badge', () => {
    render(<RookieBadge />)
    expect(screen.getByText('Novate')).toBeInTheDocument()
  })
})