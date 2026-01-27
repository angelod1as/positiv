import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './button'

describe('Button', () => {
  it('handles click events', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()

    render(<Button onClick={handleClick}>Click me</Button>)
    const button = screen.getByRole('button')

    await user.click(button)
    expect(handleClick).toHaveBeenCalledTimes(1)
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
})