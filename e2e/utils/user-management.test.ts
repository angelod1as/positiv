import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSupabaseDouble } from './supabase-test-double'

const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }))

vi.mock('@supabase/supabase-js', () => ({ createClient }))
vi.mock('../../app/business/newsletter/listmonk-client.server', () => ({
  removeSubscriber: vi.fn(async () => ({ success: true })),
}))
vi.mock('../../app/business/newsletter/listmonk-lists.server', () => ({
  deleteList: vi.fn(async () => ({ success: true })),
}))

const OWN_USER = { id: 'own-user', user_metadata: { is_mock_user: true, e2e_run_id: 'thisrun' } }
const OTHER_RUN_USER = { id: 'other-run-user', user_metadata: { is_mock_user: true, e2e_run_id: 'otherrun' } }
const REAL_USER = { id: 'real-user', user_metadata: {} }

function useAuthDouble(users: unknown[] = []) {
  const admin = {
    createUser: vi.fn(async () => ({ data: { user: { id: 'created', email: 'created@example.com' } }, error: null })),
    listUsers: vi.fn(async () => ({ data: { users }, error: null })),
    deleteUser: vi.fn(async () => ({ error: null })),
  }
  const double = createSupabaseDouble(() => ({ data: [], error: null }), { admin })
  createClient.mockReturnValue(double.client)
  return admin
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

describe('generateTestEmail', () => {
  it('carries the run id so cleanup can tell runs apart', async () => {
    const { generateTestEmail } = await import('./user-management')

    expect(generateTestEmail()).toMatch(/^test-thisrun-.+@example\.com$/)
  })
})

describe('createTestUser', () => {
  it('stamps the run that created the user', async () => {
    const admin = useAuthDouble()
    const { createTestUser } = await import('./user-management')

    await createTestUser('someone@example.com', 'Password1!')

    expect(admin.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        user_metadata: expect.objectContaining({ is_mock_user: true, e2e_run_id: 'thisrun' }),
      })
    )
  })
})

describe('deleteAllTestUsers', () => {
  it('deletes the users this run created', async () => {
    const admin = useAuthDouble([OWN_USER, OTHER_RUN_USER, REAL_USER])
    const { deleteAllTestUsers } = await import('./user-management')

    await deleteAllTestUsers()

    expect(admin.deleteUser).toHaveBeenCalledWith(OWN_USER.id)
  })

  it('leaves a concurrent run logged in', async () => {
    const admin = useAuthDouble([OWN_USER, OTHER_RUN_USER, REAL_USER])
    const { deleteAllTestUsers } = await import('./user-management')

    await deleteAllTestUsers()

    expect(admin.deleteUser).toHaveBeenCalledTimes(1)
  })
})
