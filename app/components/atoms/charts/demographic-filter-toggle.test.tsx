import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DemographicFilterToggle } from './demographic-filter-toggle'

describe('DemographicFilterToggle', () => {
  it('renders two buttons', () => {
    render(
      <DemographicFilterToggle mode="all" onModeChange={vi.fn()} />,
    )

    expect(
      screen.getByRole('button', { name: 'Toda a comunidade' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Quem já compareceu' }),
    ).toBeInTheDocument()
  })

  it('highlights the active mode', () => {
    render(
      <DemographicFilterToggle mode="all" onModeChange={vi.fn()} />,
    )

    const allButton = screen.getByRole('button', { name: 'Toda a comunidade' })
    expect(allButton).toHaveAttribute('data-active', 'true')
  })

  it('calls onModeChange when clicking a button', async () => {
    const user = userEvent.setup()
    const onModeChange = vi.fn()

    render(
      <DemographicFilterToggle mode="all" onModeChange={onModeChange} />,
    )

    await user.click(
      screen.getByRole('button', { name: 'Quem já compareceu' }),
    )
    expect(onModeChange).toHaveBeenCalledWith('attended')
  })

  it('has cursor-pointer class on buttons', () => {
    render(
      <DemographicFilterToggle mode="all" onModeChange={vi.fn()} />,
    )

    const buttons = screen.getAllByRole('button')
    for (const button of buttons) {
      expect(button).toHaveClass('cursor-pointer')
    }
  })
})
