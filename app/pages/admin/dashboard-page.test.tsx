import { describe, expect, it, vi } from 'vitest'
import type { Event } from '~types/database/entities.types'
import type { Route } from './+types/dashboard-page'
import type { Database } from '~/types/database/database.types'

// Mock the admin.server module
vi.mock('~/business/admin/admin.server', () => ({
  getAdminContext: vi.fn()
}))

import { getAdminContext } from '~/business/admin/admin.server'
import { loader } from './dashboard-page'

describe('Admin Dashboard Page - Event Filtering', () => {
  const createMockEvent = (overrides: Partial<Event>): Event => ({
    id: 'test-id',
    created_at: new Date().toISOString(),
    event_status: 'Draft',
    event_type: 'regular',
    auto_publish: false,
    emoji: '🎉',
    description: 'Test Event Description',
    location: 'Test Location',
    ticket_price: 100,
    total_spots: 50,
    time_event_start: new Date().toISOString(),
    time_event_end: new Date().toISOString(),
    time_application_start: null,
    time_application_end: null,
    time_interviews_start: null,
    time_interviews_end: null,
    time_group_start: null,
    time_group_end: null,
    time_payment_start: null,
    time_payment_end: null,
    title: 'Test Event',
    ...overrides
  })

  const createMockContext = (events: Event[]) => {
    const mockSupabase = {
      from: vi.fn(),
      auth: { getUser: vi.fn() }
    } as unknown as Database['public']['Tables']['events']['Row'] extends never ? never : ReturnType<typeof getAdminContext> extends Promise<{ supabase: infer S }> ? S : never

    return {
      user: { id: 'test-user-id' },
      supabase: mockSupabase,
      events,
      isAdmin: true,
      userRoles: ['admin'],
      supabaseHeaders: new Headers(),
      currentUser: { id: 'test-user-id' },
      currentProfile: { 
        id: 'test-profile-id',
        created_at: new Date().toISOString(),
        basic_data_filled: true,
        is_admin: true
      },
      host: 'http://localhost:3000'
    }
  }

  it('should exclude Completed and Cancelled events by default', async () => {
    const mockEvents = [
      createMockEvent({ id: '1', title: 'Draft Event', event_status: 'Draft' }),
      createMockEvent({ id: '2', title: 'Scheduled Event', event_status: 'Scheduled' }),
      createMockEvent({ id: '3', title: 'Open Event', event_status: 'Registration Open' }),
      createMockEvent({ id: '4', title: 'Closed Event', event_status: 'Registration Closed' }),
      createMockEvent({ id: '5', title: 'Completed Event', event_status: 'Completed' }),
      createMockEvent({ id: '6', title: 'Cancelled Event', event_status: 'Cancelled' }),
    ]

    const mockGetAdminContext = vi.mocked(getAdminContext)
    mockGetAdminContext.mockResolvedValueOnce(createMockContext(mockEvents))

    const mockRequest = new Request('http://localhost:3000/admin')
    const result = await loader({ request: mockRequest, params: {} } as Route.LoaderArgs)

    expect(result.events).toBeDefined()
    expect(result.events?.length).toBe(4)
    expect(result.events?.map(e => e.title)).toEqual([
      'Draft Event',
      'Scheduled Event',
      'Open Event',
      'Closed Event'
    ])
  })

  it('should show all events when showAllEvents query param is true', async () => {
    const mockEvents = [
      createMockEvent({ id: '1', title: 'Draft Event', event_status: 'Draft' }),
      createMockEvent({ id: '2', title: 'Scheduled Event', event_status: 'Scheduled' }),
      createMockEvent({ id: '3', title: 'Open Event', event_status: 'Registration Open' }),
      createMockEvent({ id: '4', title: 'Closed Event', event_status: 'Registration Closed' }),
      createMockEvent({ id: '5', title: 'Completed Event', event_status: 'Completed' }),
      createMockEvent({ id: '6', title: 'Cancelled Event', event_status: 'Cancelled' }),
    ]

    const mockGetAdminContext = vi.mocked(getAdminContext)
    mockGetAdminContext.mockResolvedValueOnce(createMockContext(mockEvents))

    const mockRequest = new Request('http://localhost:3000/admin?showAllEvents=true')
    const result = await loader({ request: mockRequest, params: {} } as Route.LoaderArgs)

    expect(result.events).toBeDefined()
    expect(result.events?.length).toBe(6)
    expect(result.events?.map(e => e.title)).toEqual([
      'Draft Event',
      'Scheduled Event',
      'Open Event',
      'Closed Event',
      'Completed Event',
      'Cancelled Event'
    ])
  })

  it('should sort events by start date', async () => {
    const futureDate = new Date('2025-12-01').toISOString()
    const nearDate = new Date('2025-10-01').toISOString()
    const pastDate = new Date('2025-01-01').toISOString()

    const mockEvents = [
      createMockEvent({ id: '1', title: 'Future Event', event_status: 'Draft', time_event_start: futureDate }),
      createMockEvent({ id: '2', title: 'Near Event', event_status: 'Scheduled', time_event_start: nearDate }),
      createMockEvent({ id: '3', title: 'Past Event', event_status: 'Registration Open', time_event_start: pastDate }),
    ]

    const mockGetAdminContext = vi.mocked(getAdminContext)
    mockGetAdminContext.mockResolvedValueOnce(createMockContext(mockEvents))

    const mockRequest = new Request('http://localhost:3000/admin')
    const result = await loader({ request: mockRequest, params: {} } as Route.LoaderArgs)

    expect(result.events?.map(e => e.title)).toEqual([
      'Past Event',
      'Near Event',
      'Future Event'
    ])
  })
})