import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../app/types/database/database.types'
import { TEST_USERS } from '../fixtures/test-users'

export function createSupabaseAdminClient() {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
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
    .eq('user_id', userId)
  
  if (error) {
    console.error(`Error cleaning up event participations for user ${userId}:`, error)
  }
}

export async function cleanupEventReminders(userId: string): Promise<void> {
  const supabase = createSupabaseAdminClient()
  
  const { error } = await supabase
    .from('event_reminders')
    .delete()
    .eq('user_id', userId)
  
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
      agreed_to_terms: false,
      agreed_to_terms_at: null,
      has_filled_first_time_form: false,
      general_notes: null,
      is_profile_filled: false
    })
    .eq('id', profile.id)
  
  if (updateError) {
    console.error(`Error resetting profile state for ${email}:`, updateError)
  }
}

export async function setupUserAsFullyOnboarded(email: string): Promise<void> {
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
  
  // Update profile to be fully onboarded
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      agreed_to_terms: true,
      agreed_to_terms_at: new Date().toISOString(),
      has_filled_first_time_form: true,
      is_profile_filled: true,
      full_name: 'Test E2E User',
      social_name: 'E2E Test',
      phone: 11999999999,
      gender: ['mulher_cis'],
      orientation: ['hetero'],
      pronouns: ['ela_dela'],
      date_of_birth: '1990-01-01',
      rg: '123456789',
      rg_issuer: 'SSP/SP',
      cpf: '12345678900',
      where_lives: 'São Paulo',
      how_did_you_meet_us: 'E2E Tests'
    })
    .eq('id', profile.id)
  
  if (updateError) {
    console.error(`Error setting up user as onboarded for ${email}:`, updateError)
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