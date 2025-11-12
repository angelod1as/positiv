import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import type { FetcherWithComponents } from 'react-router'
import { AdminViewEventParticipantsTable } from './view-event-participants-table'
import type { ProfileWithExtraData } from '~/business/admin/admin.server'
import type { ComposableFetcherData } from '~types/database/entities.types'

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
    data: { success: true, intent: 'test', data: null },
    formData: undefined,
    formMethod: undefined,
    formAction: undefined,
    formEncType: undefined,
    text: undefined,
    json: undefined,
  } as unknown as FetcherWithComponents<ComposableFetcherData>

  const mockParticipants: Partial<ProfileWithExtraData>[] = [
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
      date_of_birth: null,
      where_lives: null,
      race_color: null,
      rg: null,
      rg_issuer: null,
      general_notes: null,
      how_came_to_us: null,
      basic_data_filled: true,
      became_veteran_date: null,
      user_id: null,
      created_at: '2025-01-01T00:00:00Z',
      id: 'ep1',
      application_status: 'finalised',
      attendance_status: 'attended',
      spot_type: 'regular',
      approved_to_attend: 'approved',
      flag: 'none',
      flag_notes: null,
      notes: null,
      is_veteran: false,
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
      pronouns: null,
      date_of_birth: null,
      where_lives: null,
      race_color: null,
      rg: null,
      rg_issuer: null,
      general_notes: null,
      how_came_to_us: null,
      basic_data_filled: true,
      became_veteran_date: null,
      user_id: null,
      created_at: '2025-01-01T00:00:00Z',
      id: 'ep2',
      application_status: 'finalised',
      attendance_status: 'not-attended',
      spot_type: 'regular',
      approved_to_attend: 'approved',
      flag: 'none',
      flag_notes: null,
      notes: null,
      is_veteran: false,
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
      pronouns: null,
      date_of_birth: null,
      where_lives: null,
      race_color: null,
      rg: null,
      rg_issuer: null,
      general_notes: null,
      how_came_to_us: null,
      basic_data_filled: true,
      became_veteran_date: null,
      user_id: null,
      created_at: '2025-01-01T00:00:00Z',
      id: 'ep3',
      application_status: 'pending',
      attendance_status: 'pending',
      spot_type: 'regular',
      approved_to_attend: 'rejected',
      flag: 'none',
      flag_notes: null,
      notes: null,
      is_veteran: true,
    },
  ]

  it('should render table with participants', () => {
    render(
      <AdminViewEventParticipantsTable
        participants={mockParticipants as ProfileWithExtraData[]}
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
        participants={mockParticipants as ProfileWithExtraData[]}
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
        participants={mockParticipants as ProfileWithExtraData[]}
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
          participants={participantsWithNullSocialName as ProfileWithExtraData[]}
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
        participants={mockParticipants as ProfileWithExtraData[]}
        eventId="event-1"
        fetcher={mockFetcher}
      />
    )

    expect(screen.getByText('Pedro Oliveira')).toBeInTheDocument()
    expect(screen.getByText(/Petra Oliveira/i)).toBeInTheDocument()
  })
})
