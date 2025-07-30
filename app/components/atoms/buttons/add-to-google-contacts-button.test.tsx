import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { AddToGoogleContactsButton } from './add-to-google-contacts-button'
import type { ProfileForGoogleContacts } from '~/lib/helpers/google-contacts'

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock window.open
const mockOpen = vi.fn()
window.open = mockOpen

describe('AddToGoogleContactsButton', () => {
  const mockProfile: ProfileForGoogleContacts = {
    social_name: 'João',
    full_name: 'João Silva Santos',
    gender: ['cis'],
    pronouns: ['ele/dele'],
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render the button with correct text', () => {
    render(
      <AddToGoogleContactsButton
        profile={mockProfile}
        email="joao@example.com"
        phone="11987654321"
      />
    )

    expect(screen.getByRole('button', { name: /adicionar ao google contacts/i })).toBeInTheDocument()
  })

  it('should open Google Contacts with correct URL on click', async () => {
    const user = userEvent.setup()
    
    render(
      <AddToGoogleContactsButton
        profile={mockProfile}
        email="joao@example.com"
        phone="11987654321"
      />
    )

    await user.click(screen.getByRole('button'))

    // Since clipboard operations might fail in tests, just check that window.open was called
    expect(mockOpen).toHaveBeenCalledWith(
      'https://contacts.google.com/u/0/new?hl=pt-BR&email=joao@example.com&phone=11987654321',
      '_blank'
    )
  })

  it('should handle missing phone number', async () => {
    const user = userEvent.setup()
    
    render(
      <AddToGoogleContactsButton
        profile={mockProfile}
        email="joao@example.com"
        phone={null}
      />
    )

    await user.click(screen.getByRole('button'))

    expect(mockOpen).toHaveBeenCalledWith(
      'https://contacts.google.com/u/0/new?hl=pt-BR&email=joao@example.com',
      '_blank'
    )
  })

  it('should be disabled when disabled prop is true', () => {
    render(
      <AddToGoogleContactsButton
        profile={mockProfile}
        email="joao@example.com"
        phone="11987654321"
        disabled
      />
    )

    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('should apply custom className when provided', () => {
    render(
      <AddToGoogleContactsButton
        profile={mockProfile}
        email="joao@example.com"
        phone="11987654321"
        className="custom-class"
      />
    )

    expect(screen.getByRole('button')).toHaveClass('custom-class')
  })
})