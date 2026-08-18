import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSupabaseDouble, type RecordedQuery, type SupabaseDouble } from './supabase-test-double'

const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }))

vi.mock('@supabase/supabase-js', () => ({ createClient }))
vi.mock('../../app/business/newsletter/listmonk-client.server', () => ({
  removeSubscriber: vi.fn(async () => ({ success: true })),
}))
vi.mock('../../app/business/newsletter/listmonk-lists.server', () => ({
  deleteList: vi.fn(async () => ({ success: true })),
}))

const OTHER_RUN_EVENT = { id: 'event-from-another-run', title: '[E2E-TEST:otherrun] Event', listmonk_list_id: null }
const OWN_EVENT = { id: 'event-from-this-run', title: '[E2E-TEST:thisrun] Event', listmonk_list_id: null }

function useDouble(respond: (query: RecordedQuery) => unknown): SupabaseDouble {
  const double = createSupabaseDouble(respond)
  createClient.mockReturnValue(double.client)
  return double
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.VITE_SUPABASE_URL = 'http://localhost:54321'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key'
  process.env.E2E_RUN_ID = 'thisrun'
})

afterEach(() => {
  delete process.env.E2E_RUN_ID
})

describe('cleanupTestEvents', () => {
  it('selects only the events created by the current run', async () => {
    const double = useDouble(() => ({ data: [], error: null }))
    const { cleanupTestEvents } = await import('./db-cleanup')

    await cleanupTestEvents()

    expect(double.argumentsOf('events', 'ilike')).toEqual(['title', '[E2E-TEST:thisrun]%'])
  })

  it('does not delete events belonging to a run in another worktree', async () => {
    const double = useDouble(query => {
      if (query.table === 'events' && query.operations.some(op => op.name === 'select')) {
        const pattern = query.operations.find(op => op.name === 'ilike')?.args[1] as string
        const prefix = pattern.replace(/%$/, '')
        return { data: [OWN_EVENT, OTHER_RUN_EVENT].filter(event => event.title.startsWith(prefix)), error: null }
      }
      return { data: [], error: null }
    })
    const { cleanupTestEvents } = await import('./db-cleanup')

    await cleanupTestEvents()

    const deletedIds = double.argumentsOf('event_participants', 'in')

    expect(deletedIds).toEqual(['event_id', [OWN_EVENT.id]])
  })
})

describe('cleanupListmonkSubscribers', () => {
  it('only looks at the email addresses this run created', async () => {
    const double = useDouble(() => ({ data: [], error: null }))
    const { cleanupListmonkSubscribers } = await import('./db-cleanup')

    await cleanupListmonkSubscribers()

    expect(double.argumentsOf('profiles', 'ilike')).toEqual(['email', 'test-thisrun-%@example.com'])
  })
})
