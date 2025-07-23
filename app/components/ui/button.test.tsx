import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './button'

describe('Button', () => {
  it('renders with text content', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('applies variant classes', () => {
    const { rerender } = render(<Button variant="default">Default</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('bg-primary')

    rerender(<Button variant="destructive">Destructive</Button>)
    expect(button).toHaveClass('bg-destructive')

    rerender(<Button variant="outline">Outline</Button>)
    expect(button).toHaveClass('border')

    rerender(<Button variant="secondary">Secondary</Button>)
    expect(button).toHaveClass('bg-secondary')

    rerender(<Button variant="ghost">Ghost</Button>)
    expect(button).toHaveClass('hover:bg-accent')

    rerender(<Button variant="link">Link</Button>)
    expect(button).toHaveClass('underline-offset-3')
  })

  it('applies size classes', () => {
    const { rerender } = render(<Button size="default">Default</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('h-9')

    rerender(<Button size="sm">Small</Button>)
    expect(button).toHaveClass('h-8')

    rerender(<Button size="lg">Large</Button>)
    expect(button).toHaveClass('h-10')

    rerender(<Button size="icon">Icon</Button>)
    expect(button).toHaveClass('size-9')
  })

  it('handles click events', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()
    
    render(<Button onClick={handleClick}>Click me</Button>)
    const button = screen.getByRole('button')
    
    await user.click(button)
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('can be disabled', () => {
    render(<Button disabled>Disabled</Button>)
    const button = screen.getByRole('button')
    
    expect(button).toBeDisabled()
  })

  it('applies custom className', () => {
    render(<Button className="custom-class">Custom</Button>)
    const button = screen.getByRole('button')
    
    expect(button).toHaveClass('custom-class')
  })

  it('renders as child when asChild is true', () => {
    render(
      <Button asChild>
        <a href="/test">Link as button</a>
      </Button>
    )
    
    const link = screen.getByRole('link', { name: 'Link as button' })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/test')
    expect(link).toHaveAttribute('data-slot', 'button')
  })

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLButtonElement>()
    render(<Button ref={ref}>Button with ref</Button>)
    
    expect(ref.current).toBeInstanceOf(HTMLButtonElement)
    expect(ref.current?.textContent).toBe('Button with ref')
  })

  it('spreads additional props', () => {
    render(
      <Button data-testid="custom-button" aria-label="Custom label">
        Button
      </Button>
    )
    
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('data-testid', 'custom-button')
    expect(button).toHaveAttribute('aria-label', 'Custom label')
  })
})