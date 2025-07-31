import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../app/types/database/database.types'
import { TEST_USERS } from '../fixtures/test-users'
import { TEST_USER_PROFILE_DATA } from '../fixtures/test-data'

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
    console.error('Error fetching test user IDs:', error)
    return []
  }
  
  return profiles?.map(p => p.id) || []
}

export async function cleanupEventParticipations(userId: string): Promise<void> {
  const supabase = createSupabaseAdminClient()
  
  const { error } = await supabase
    .from('event_participants')
    .delete()
    .eq('profile_id', userId)
  
  if (error) {
    console.error(`Error cleaning up event participations for user ${userId}:`, error)
  }
}

export async function cleanupEventReminders(userId: string): Promise<void> {
  const supabase = createSupabaseAdminClient()
  
  const { error } = await supabase
    .from('event_reminders')
    .delete()
    .eq('profile_id', userId)
  
  if (error) {
    console.error(`Error cleaning up event reminders for user ${userId}:`, error)
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
    console.error(`Error fetching profile for ${email}:`, profileError)
    return
  }
  
  await cleanupEventParticipations(profile.id)
  await cleanupEventReminders(profile.id)
  
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      basic_data_filled: false,
      general_notes: null
    })
    .eq('id', profile.id)
  
  if (updateError) {
    console.error(`Error resetting profile state for ${email}:`, updateError)
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
    console.error(`Error fetching profile for ${email}:`, profileError)
    return
  }
  
  await cleanupEventParticipations(profile.id)
  await cleanupEventReminders(profile.id)
}

export async function cleanupAllTestUsers(): Promise<void> {
  const testEmails = Object.values(TEST_USERS).map(user => user.email)
  
  for (const email of testEmails) {
    await resetUserToDefaultState(email)
  }
  
  // console.log(`✅ Reset ${testEmails.length} test users to default state`)
}