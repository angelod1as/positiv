import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../app/types/database/database.types'
import { TEST_USERS } from '../fixtures/test-users'
import { TEST_USER_PROFILE_DATA } from '../fixtures/test-data'
import { removeSubscriber } from '../../app/business/newsletter/listmonk-client.server'

// Custom error class for database cleanup operations
export class CleanupError extends Error {
  constructor(message: string, public readonly operation: string, public readonly cause?: unknown) {
    super(message)
    this.name = 'CleanupError'
  }
}

export function createSupabaseAdminClient() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

export async function getTestUserIds(): Promise<string[]> {
  const supabase = createSupabaseAdminClient()
  
  const testEmails = Object.values(TEST_USERS).map(user => user.email)
  
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id')
    .in('email', testEmails)
  
  if (error) {
    // This is a critical operation - if we can't get test user IDs, we can't clean up properly
    throw new CleanupError(
      `Failed to fetch test user IDs for emails: ${testEmails.join(', ')}`,
      'getTestUserIds',
      error
    )
  }
  
  return profiles?.map(p => p.id) || []
}

/**
 * Cleans up event participations for a user
 * @param userId - The user ID to clean up participations for
 * @param throwOnError - If true, throws on error. If false, logs warning and continues.
 *                       Use true for critical operations (setup), false for best-effort cleanup.
 */
export async function cleanupEventParticipations(userId: string, throwOnError: boolean = false): Promise<void> {
  const supabase = createSupabaseAdminClient()
  
  const { error } = await supabase
    .from('event_participants')
    .delete()
    .eq('profile_id', userId)
  
  if (error) {
    const message = `Failed to clean up event participations for user ${userId}`
    
    if (throwOnError) {
      throw new CleanupError(message, 'cleanupEventParticipations', error)
    } else {
      // Log but continue - this might be acceptable in some cleanup scenarios
      console.warn(`[Non-critical] ${message}:`, error)
    }
  }
}

/**
 * Cleans up event reminders for a user
 * @param userId - The user ID to clean up reminders for
 * @param throwOnError - If true, throws on error. If false, logs warning and continues.
 *                       Use true for critical operations (setup), false for best-effort cleanup.
 */
export async function cleanupEventReminders(userId: string, throwOnError: boolean = false): Promise<void> {
  const supabase = createSupabaseAdminClient()
  
  const { error } = await supabase
    .from('event_newsletter_campaigns')
    .delete()
    .eq('profile_id', userId)
  
  if (error) {
    const message = `Failed to clean up event reminders for user ${userId}`
    
    if (throwOnError) {
      throw new CleanupError(message, 'cleanupEventReminders', error)
    } else {
      // Log but continue - this might be acceptable in some cleanup scenarios
      console.warn(`[Non-critical] ${message}:`, error)
    }
  }
}

export async function resetUserToDefaultState(email: string): Promise<void> {
  const supabase = createSupabaseAdminClient()
  
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single()
  
  if (profileError || !profile) {
    // This is critical for test isolation - tests should fail if cleanup doesn't work
    throw new CleanupError(
      `Failed to fetch profile for ${email}`,
      'resetUserToDefaultState',
      profileError
    )
  }
  
  // These operations should complete but aren't necessarily critical
  await cleanupEventParticipations(profile.id, false)
  await cleanupEventReminders(profile.id, false)
  
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      basic_data_filled: false,
      general_notes: null
    })
    .eq('id', profile.id)
  
  if (updateError) {
    // Profile reset is critical for test isolation
    throw new CleanupError(
      `Failed to reset profile state for ${email}`,
      'resetUserToDefaultState',
      updateError
    )
  }
}

export async function setupUserAsFullyOnboarded(email: string): Promise<void> {
  const supabase = createSupabaseAdminClient()
  
  // First, try to create the profile if it doesn't exist
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id, basic_data_filled')
    .eq('email', email)
    .single()
  
  if (!existingProfile) {
    // Profile doesn't exist yet - can't create it directly without user_id
    // This should only be called after user has logged in at least once
    throw new Error(`Profile not found for ${email}. User must log in first to create profile.`)
  }
  
  // Profile exists - update it
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      basic_data_filled: true,
      ...TEST_USER_PROFILE_DATA
    })
    .eq('id', existingProfile.id)
  
  if (updateError) {
    throw new Error(`Failed to update profile for ${email}: ${updateError.message}`)
  }
}

export async function cleanupTestUserData(email: string): Promise<void> {
  const supabase = createSupabaseAdminClient()
  
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single()
  
  if (profileError || !profile) {
    // In cleanup context, we might want to continue even if a profile doesn't exist
    console.warn(`[Non-critical] Profile not found for ${email}, skipping cleanup:`, profileError)
    return
  }
  
  // Use non-throwing cleanup for test data cleanup
  await cleanupEventParticipations(profile.id, false)
  await cleanupEventReminders(profile.id, false)
}

export async function cleanupAllTestUsers(): Promise<void> {
  const testEmails = Object.values(TEST_USERS).map(user => user.email)
  const errors: CleanupError[] = []
  
  for (const email of testEmails) {
    try {
      await resetUserToDefaultState(email)
    } catch (error) {
      if (error instanceof CleanupError) {
        errors.push(error)
      } else {
        errors.push(new CleanupError(
          `Unexpected error resetting ${email}`,
          'cleanupAllTestUsers',
          error
        ))
      }
    }
  }
  
  if (errors.length > 0) {
    // Report all errors but don't necessarily fail the entire test suite
    console.error(`⚠️ Cleanup completed with ${errors.length} errors:`)
    errors.forEach(err => {
      console.error(`  - ${err.operation}: ${err.message}`)
    })
    
    // Optionally throw if we want strict cleanup
    if (process.env.STRICT_CLEANUP === 'true') {
      throw new AggregateError(errors, 'Multiple cleanup operations failed')
    }
  }
}

export async function cleanupTestEvents(): Promise<void> {
  const supabase = createSupabaseAdminClient()
  
  // Delete only events with the specific E2E test prefix - don't delete seed events
  const { data: testEvents, error: fetchError } = await supabase
    .from('events')
    .select('id, title')
    .ilike('title', '[E2E-TEST]%')
  
  if (fetchError) {
    throw new CleanupError(
      'Failed to fetch test events for cleanup',
      'cleanupTestEvents',
      fetchError
    )
  }
  
  if (!testEvents || testEvents.length === 0) {
    return
  }
  
  // Delete associated event participants first (due to foreign key constraints)
  const eventIds = testEvents.map(event => event.id)
  let hasErrors = false
  
  const { error: participantsError } = await supabase
    .from('event_participants')
    .delete()
    .in('event_id', eventIds)
  
  if (participantsError) {
    console.error('Error deleting event participants:', participantsError)
    hasErrors = true
  }
  
  // Delete associated event reminders
  const { error: remindersError } = await supabase
    .from('event_newsletter_campaigns')
    .delete()
    .in('event_id', eventIds)
  
  if (remindersError) {
    console.error('Error deleting event reminders:', remindersError)
    hasErrors = true
  }
  
  // Now delete the events
  const { error: deleteError } = await supabase
    .from('events')
    .delete()
    .in('id', eventIds)
  
  if (deleteError) {
    // Event deletion is critical - if we can't delete test events, we'll have pollution
    throw new CleanupError(
      `Failed to delete ${testEvents.length} test events`,
      'cleanupTestEvents',
      deleteError
    )
  }
  
  if (hasErrors) {
    console.warn(`⚠️ Cleaned up ${testEvents.length} test events with some non-critical errors`)
  } else {
    console.info(`✅ Cleaned up ${testEvents.length} test events`)
  }
}

/**
 * Cleans up Listmonk newsletter subscribers for test users
 * This removes test users from all Listmonk mailing lists
 * Non-throwing: Logs errors but continues (Listmonk might be unavailable or not configured)
 */
export async function cleanupListmonkSubscribers(): Promise<void> {
  const supabase = createSupabaseAdminClient()

  // Get all profiles with @example.com email (test users)
  const { data: profiles, error: fetchError } = await supabase
    .from('profiles')
    .select('email')
    .ilike('email', '%@example.com')

  if (fetchError) {
    console.warn('[Non-critical] Failed to fetch test user emails for Listmonk cleanup:', fetchError)
    return
  }

  if (!profiles || profiles.length === 0) {
    console.info('✅ No test users found for Listmonk cleanup')
    return
  }

  const emails = profiles.map(p => p.email)
  let successCount = 0
  let errorCount = 0

  for (const email of emails) {
    try {
      const result = await removeSubscriber(email)

      if (result.success) {
        successCount++
      } else {
        console.warn(`[Non-critical] Failed to remove ${email} from Listmonk:`, result.errors)
        errorCount++
      }
    } catch (error) {
      console.warn(`[Non-critical] Error removing ${email} from Listmonk:`, error)
      errorCount++
    }
  }

  if (errorCount > 0) {
    console.warn(`⚠️ Listmonk cleanup: ${successCount} succeeded, ${errorCount} failed`)
  } else {
    console.info(`✅ Cleaned up ${successCount} Listmonk subscribers`)
  }
}