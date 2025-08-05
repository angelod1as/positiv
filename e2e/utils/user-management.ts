import { createSupabaseAdminClient } from './db-cleanup'

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
      // Delete event participations
      await supabase
        .from('event_participants')
        .delete()
        .eq('profile_id', profile.id)

      // Delete event reminders
      await supabase
        .from('event_reminders')
        .delete()
        .eq('profile_id', profile.id)

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
    const mockUsers = users.filter(user => user.user_metadata?.is_mock_user === true)

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
  return `test-${timestamp}-${random}@example.com`
}

export function generateTestPassword(): string {
  // Generate a secure password that meets requirements
  return `Test${Date.now()}!`
}