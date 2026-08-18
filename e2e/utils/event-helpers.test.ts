import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSupabaseDouble } from './supabase-test-double'

const { createClient, createTestUser } = vi.hoisted(() => ({
  createClient: vi.fn(),
  createTestUser: vi.fn(async (email: string) => ({ id: 'user-id', email, password: 'Password1!' })),
}))

vi.mock('@supabase/supabase-js', () => ({ createClient }))
vi.mock('./user-management', () => ({ createTestUser }))
vi.mock('../../app/business/newsletter/listmonk-client.server', () => ({
  removeSubscriber: vi.fn(async () => ({ success: true })),
}))
vi.mock('../../app/business/newsletter/listmonk-lists.server', () => ({
  deleteList: vi.fn(async () => ({ success: true })),
}))

beforeEach(() => {
  vi.clearAllMocks()
  process.env.VITE_SUPABASE_URL = 'http://localhost:54321'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key'
  process.env.E2E_RUN_ID = 'thisrun'

  const double = createSupabaseDouble(query =>
    query.operations.some(op => op.name === 'single')
      ? { data: { id: 'profile-id', full_name: 'Test', social_name: 'Test', phone: 11999999000 }, error: null }
      : { data: null, error: null }
  )
  createClient.mockReturnValue(double.client)
})

afterEach(() => {
  delete process.env.E2E_RUN_ID
})

describe('createTestEventWithParticipants', () => {
  it('gives every participant an address the current run owns', async () => {
    const { createTestEventWithParticipants } = await import('./event-helpers')

    await createTestEventWithParticipants('event-id', 2)

    for (const [email] of createTestUser.mock.calls) {
      expect(email).toMatch(/^test-thisrun-.+@example\.com$/)
    }
    expect(createTestUser).toHaveBeenCalledTimes(2)
  })
})
