import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { AdminViewEventParticipantsTable } from './view-event-participants-table'
import type { ProfileWithExtraData } from '~/business/admin/admin.server'

vi.mock('react-router', () => ({
  Link: ({
    children,
    to,
    ...props
  }: {
    children: React.ReactNode
    to: string
  }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useFetcher: () => ({
    Form: ({ children, ...props }: { children: React.ReactNode }) => (
      <form {...props}>{children}</form>
    ),
    submit: vi.fn(),
    state: 'idle',
    data: null,
  }),
}))

const mockSessionStorage = new Map<string, string>()

beforeEach(() => {
  Object.defineProperty(window, 'sessionStorage', {
    value: {
      getItem: vi.fn((key: string) => mockSessionStorage.get(key) || null),
      setItem: vi.fn((key: string, value: string) => {
        mockSessionStorage.set(key, value)
      }),
      removeItem: vi.fn((key: string) => {
        mockSessionStorage.delete(key)
      }),
      clear: vi.fn(() => {
        mockSessionStorage.clear()
      }),
    },
    writable: true,
  })
})

afterEach(() => {
  vi.clearAllMocks()
  mockSessionStorage.clear()
})

describe('AdminViewEventParticipantsTable - Search Functionality', () => {
  const mockFetcher = {
    Form: ({ children, ...props }: { children: React.ReactNode }) => (
      <form {...props}>{children}</form>
    ),
    submit: vi.fn(),
    load: vi.fn(),
    state: 'idle' as const,
    data: { success: true, data: null },
    formData: undefined,
    formMethod: undefined,
    formAction: undefined,
    formEncType: undefined,
    text: undefined,
    json: undefined,
  } as any

  const mockParticipants: ProfileWithExtraData[] = [
    {
      profile_id: '1',
      full_name: 'João Silva',
      social_name: 'Jo Silva',
      email: 'joao@example.com',
      phone: null,
      cpf: null,
      gender: ['Cisgênero'],
      orientation: ['Heterossexual'],
      pronouns: null,
      birthday: null,
      city: null,
      state: null,
      race_color: null,
      is_admin: false,
      occupation: null,
      about_me: null,
      how_found: null,
      created_at: '2025-01-01T00:00:00Z',
      whatsapp_optin: false,
      newsletter_optin: false,
      terms_accepted: true,
      profile_complete: true,
      event_participant_id: 'ep1',
      application_status: 'finalised',
      attendance_status: 'attended',
      spot_type: 'regular',
      approved_to_attend: 'approved',
      number_on_list: 1,
      flag: 'none',
      flag_notes: null,
      notes: null,
      is_veteran: false,
      is_rookie: true,
      participant_last_event_id: null,
      participant_last_event_title: null,
      participant_last_event_date: null,
      participant_last_application_status: null,
      participant_last_attendance_status: null,
    },
    {
      profile_id: '2',
      full_name: 'Maria Santos',
      social_name: null,
      email: 'maria@example.com',
      phone: null,
      cpf: null,
      gender: ['Cisgênero'],
      orientation: ['Heterossexual'],
      pronouns: ['ela/dela'],
      birthday: null,
      city: null,
      state: null,
      race_color: null,
      is_admin: false,
      occupation: null,
      about_me: null,
      how_found: null,
      created_at: '2025-01-01T00:00:00Z',
      whatsapp_optin: false,
      newsletter_optin: false,
      terms_accepted: true,
      profile_complete: true,
      event_participant_id: 'ep2',
      application_status: 'finalised',
      attendance_status: 'not-attended',
      spot_type: 'regular',
      approved_to_attend: 'approved',
      number_on_list: 2,
      flag: 'none',
      flag_notes: null,
      notes: null,
      is_veteran: false,
      is_rookie: false,
      participant_last_event_id: null,
      participant_last_event_title: null,
      participant_last_event_date: null,
      participant_last_application_status: null,
      participant_last_attendance_status: null,
    },
    {
      profile_id: '3',
      full_name: 'Pedro Oliveira',
      social_name: 'Petra Oliveira',
      email: 'pedro@example.com',
      phone: null,
      cpf: null,
      gender: ['Transgênero'],
      orientation: ['Pansexual'],
      pronouns: ['ela/dela'],
      birthday: null,
      city: null,
      state: null,
      race_color: null,
      is_admin: false,
      occupation: null,
      about_me: null,
      how_found: null,
      created_at: '2025-01-01T00:00:00Z',
      whatsapp_optin: false,
      newsletter_optin: false,
      terms_accepted: true,
      profile_complete: true,
      event_participant_id: 'ep3',
      application_status: 'pending',
      attendance_status: 'pending',
      spot_type: 'regular',
      approved_to_attend: 'rejected',
      number_on_list: 3,
      flag: 'none',
      flag_notes: null,
      notes: null,
      is_veteran: true,
      is_rookie: false,
      participant_last_event_id: 'prev-event-1',
      participant_last_event_title: 'Previous Event',
      participant_last_event_date: '2024-12-01',
      participant_last_application_status: 'finalised',
      participant_last_attendance_status: 'attended',
    },
  ]

  it('should render table with participants', () => {
    render(
      <AdminViewEventParticipantsTable
        participants={mockParticipants}
        eventId="event-1"
        fetcher={mockFetcher}
      />
    )

    expect(screen.getByText('João Silva')).toBeInTheDocument()
    expect(screen.getByText('Maria Santos')).toBeInTheDocument()
    expect(screen.getByText('Pedro Oliveira')).toBeInTheDocument()
  })

  it('should include full_name in search fields', () => {
    const { container } = render(
      <AdminViewEventParticipantsTable
        participants={mockParticipants}
        eventId="event-1"
        fetcher={mockFetcher}
      />
    )

    const dataTable = container.querySelector('[data-pc-name="datatable"]')
    expect(dataTable).toBeInTheDocument()
  })

  it('should include social_name in search fields for comprehensive participant search', () => {
    const { container } = render(
      <AdminViewEventParticipantsTable
        participants={mockParticipants}
        eventId="event-1"
        fetcher={mockFetcher}
      />
    )

    const dataTable = container.querySelector('[data-pc-name="datatable"]')
    expect(dataTable).toBeInTheDocument()
  })

  it('should handle participants with null social_name without errors', () => {
    const participantsWithNullSocialName = mockParticipants.filter(
      (p) => p.social_name === null
    )

    expect(() => {
      render(
        <AdminViewEventParticipantsTable
          participants={participantsWithNullSocialName}
          eventId="event-1"
          fetcher={mockFetcher}
        />
      )
    }).not.toThrow()

    expect(screen.getByText('Maria Santos')).toBeInTheDocument()
  })

  it('should display both full_name and social_name for participants who have both', () => {
    render(
      <AdminViewEventParticipantsTable
        participants={mockParticipants}
        eventId="event-1"
        fetcher={mockFetcher}
      />
    )

    expect(screen.getByText('Pedro Oliveira')).toBeInTheDocument()
    expect(screen.getByText(/Petra Oliveira/i)).toBeInTheDocument()
  })
})
