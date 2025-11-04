import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { ProfileWithExtraData } from '~/business/admin/admin.server'
import { BasicData } from './basic-data'

// Mock the AddToGoogleContactsButton
vi.mock('~/components/atoms/buttons/add-to-google-contacts-button', () => ({
  AddToGoogleContactsButton: vi.fn(({ profile }) => (
    <button data-testid="google-contacts-button">
      Add to Google Contacts - {profile.social_name || profile.full_name}
    </button>
  )),
}))

const renderWithRouter = (component: React.ReactElement) => {
  const router = createMemoryRouter([
    {
      path: '/',
      element: component,
    },
  ])

  return render(<RouterProvider router={router} />)
}

describe('BasicData', () => {
  const mockProfile = {
    id: '123',
    user_id: '456',
    full_name: 'João Silva Santos',
    social_name: 'João',
    email: 'joao@example.com',
    phone: 11987654321,
    cpf: '123.456.789-00',
    rg: '12.345.678-9',
    rg_issuer: 'SSP-SP',
    date_of_birth: '1990-01-01',
    gender: ['cis'],
    pronouns: ['ele/dele'],
    orientation: ['heterossexual'],
    race_color: ["Indígena"],
    where_lives: 'São Paulo',
    how_came_to_us: 'Indicação',
    is_veteran: false,
    was_admin_skipped_last_event: false,
    flag: 'none',
    flag_notes: null,
    approved_to_attend: 'approved',
    basic_data_filled: true,
    created_at: '2023-01-01',
    general_notes: null,
    became_veteran_date: "2025-07-19 16:00:00+00",
  } as ProfileWithExtraData

  it('should render the AddToGoogleContactsButton', () => {
    renderWithRouter(<BasicData profile={mockProfile} />)

    expect(screen.getByTestId('google-contacts-button')).toBeInTheDocument()
    expect(screen.getByTestId('google-contacts-button')).toHaveTextContent('Add to Google Contacts - João')
  })

  it('should pass correct props to AddToGoogleContactsButton', async () => {
    const { AddToGoogleContactsButton } = await import('~/components/atoms/buttons/add-to-google-contacts-button')
    const MockedButton = vi.mocked(AddToGoogleContactsButton)

    renderWithRouter(<BasicData profile={mockProfile} />)

    // Check that it was called with the expected props (ignoring the second argument)
    expect(MockedButton).toHaveBeenCalled()
    const firstCall = MockedButton.mock.calls[0][0]
    expect(firstCall).toMatchObject({
      profile: {
        social_name: 'João',
        full_name: 'João Silva Santos',
        gender: ['cis'],
        pronouns: ['ele/dele'],
      },
      email: 'joao@example.com',
      phone: 11987654321,
    })
  })

  it('should render basic data correctly', () => {
    renderWithRouter(<BasicData profile={mockProfile} />)

    expect(screen.getByText('Dados básicos')).toBeInTheDocument()
    expect(screen.getByText('João Silva Santos')).toBeInTheDocument()
    expect(screen.getByText('joao@example.com')).toBeInTheDocument()
    expect(screen.getByText('123.456.789-00')).toBeInTheDocument()
    expect(screen.getByText('12.345.678-9 SSP-SP')).toBeInTheDocument()
  })
})