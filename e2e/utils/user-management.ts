import { createSupabaseAdminClient } from './db-cleanup'
import {
  abandonedBefore,
  getRunId,
  isRunScopedEmail,
  runEmail,
  runEmailPrefix,
} from './run-context'

export interface TestUser {
  id: string
  email: string
  password: string
}

export async function createTestUser(email: string, password: string, options?: { 
  admin?: boolean 
}): Promise<TestUser> {
  const { admin = false } = options || {}
  const supabase = createSupabaseAdminClient()

  try {
    // Create user with email confirmed
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        is_mock_user: true, // Mark for cleanup
        e2e_run_id: getRunId(), // Only this run's teardown may delete it
      },
    })

    if (error) {
      throw new Error(`Failed to create user ${email}: ${error.message}`)
    }

    if (!data.user) {
      throw new Error(`No user data returned for ${email}`)
    }

    const newUser = data.user

    // Assign admin role if requested
    if (admin) {
      const { error: roleError } = await supabase.rpc('add_user_role', {
        p_user_id: newUser.id,
        p_role_name: 'admin',
      })

      if (roleError) {
        console.error(`Error assigning admin role to user ${newUser.email}:`, roleError)
        // Continue anyway - user is created
      }
    }

    return {
      id: newUser.id,
      email: newUser.email || email,
      password,
    }
  } catch (error) {
    console.error(`Failed to create test user ${email}:`, error)
    throw error
  }
}

export async function deleteTestUser(userId: string): Promise<void> {
  const supabase = createSupabaseAdminClient()

  try {
    // First get the profile ID if it exists
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (profile) {
      // Delete newsletter subscriptions
      await supabase
        .from('newsletter_subscriptions')
        .delete()
        .eq('profile_id', profile.id)

      // Delete event participations
      await supabase
        .from('event_participants')
        .delete()
        .eq('profile_id', profile.id)

      // Note: event_newsletter_campaigns is event-based, not profile-based
      // It will be cleaned up when events are deleted (CASCADE)

      // Delete profile
      await supabase
        .from('profiles')
        .delete()
        .eq('id', profile.id)
    }

    // Delete user from auth
    const { error } = await supabase.auth.admin.deleteUser(userId)
    
    if (error) {
      console.error(`Error deleting user ${userId}:`, error)
    }
  } catch (error) {
    console.error(`Failed to delete test user ${userId}:`, error)
  }
}

export async function deleteAllTestUsers(): Promise<void> {
  const supabase = createSupabaseAdminClient()

  try {
    // List all users
    const { data: { users }, error } = await supabase.auth.admin.listUsers()

    if (error) {
      throw new Error(`Failed to list users: ${error.message}`)
    }

    // Filter to mock users only
    const cutoff = abandonedBefore()
    const mockUsers = users.filter(user => {
      const runId = user.user_metadata?.e2e_run_id

      if (runId) {
        return runId === getRunId() || user.created_at < cutoff
      }

      // An account the suite signed up through the form carries no metadata to
      // be marked with — the app wrote it, not the fixtures. Its run-scoped
      // address is the only thing that says which run it belongs to.
      const email = user.email ?? ''
      if (!isRunScopedEmail(email)) return false

      return email.startsWith(runEmailPrefix()) || user.created_at < cutoff
    })

    console.info(`Found ${mockUsers.length} test users to delete`)

    // Delete each mock user
    for (const user of mockUsers) {
      await deleteTestUser(user.id)
    }
  } catch (error) {
    console.error('Failed to delete all test users:', error)
  }
}

export function generateTestEmail(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(7)
  return runEmail(`${timestamp}-${random}`)
}

export function generateTestPassword(): string {
  // Generate a secure password that meets requirements
  return `Test${Date.now()}!`
}