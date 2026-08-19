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

function useDouble(respond: (query: RecordedQuery) => unknown): SupabaseDouble {
  const double = createSupabaseDouble(respond)
  createClient.mockReturnValue(double.client)
  return double
}

function respondWithNoExistingEvents(query: RecordedQuery) {
  if (query.operations.some(op => op.name === 'insert')) {
    return { data: { id: 'created-event', title: 'created' }, error: null }
  }

  if (query.operations.some(op => op.name === 'single')) {
    return { data: null, error: { message: 'no rows returned' } }
  }

  return { data: [], error: null }
}

function insertedTitles(double: SupabaseDouble): string[] {
  return double.queries
    .flatMap(query => query.operations.filter(op => op.name === 'insert'))
    .map(op => (op.args[0] as { title: string }).title)
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

describe('ensureClosedTestEvent', () => {
  it('only reuses a closed event created by the current run', async () => {
    const double = useDouble(respondWithNoExistingEvents)
    const { ensureClosedTestEvent } = await import('./test-event-helpers')

    await ensureClosedTestEvent()

    expect(double.argumentsOf('events', 'like')).toEqual(['title', '[E2E:thisrun]%'])
  })

  it('tags the event it creates with the current run', async () => {
    const double = useDouble(respondWithNoExistingEvents)
    const { ensureClosedTestEvent } = await import('./test-event-helpers')

    await ensureClosedTestEvent()

    expect(insertedTitles(double)).toEqual([expect.stringContaining('[E2E:thisrun]')])
  })
})

describe('ensureMinimumOpenEvents', () => {
  it('tags every event it creates with the current run', async () => {
    const double = useDouble(respondWithNoExistingEvents)
    const { ensureMinimumOpenEvents } = await import('./test-event-helpers')

    await ensureMinimumOpenEvents(2)

    expect(insertedTitles(double)).toEqual([
      expect.stringContaining('[E2E:thisrun]'),
      expect.stringContaining('[E2E:thisrun]'),
    ])
  })
})

describe('createOpenRegularEvent', () => {
  it('tags the event it creates with the current run', async () => {
    const double = useDouble(respondWithNoExistingEvents)
    const { createOpenRegularEvent } = await import('./test-event-helpers')

    await createOpenRegularEvent()

    expect(insertedTitles(double)).toEqual([expect.stringContaining('[E2E:thisrun]')])
  })
})
