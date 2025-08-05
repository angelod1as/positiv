import { createSupabaseAdminClient } from './db-cleanup'

export interface ApplicationState {
  id: string
  profile_id: string | null
  event_id: string | null
  is_user_applied: boolean
  cancellation_date: string | null
  application_date: string
  [key: string]: string | number | boolean | null | undefined
}

export async function getApplicationState(profileId: string, eventId: string): Promise<ApplicationState | null> {
  const supabase = createSupabaseAdminClient()
  
  const { data, error } = await supabase
    .from('event_participants')
    .select('*')
    .eq('profile_id', profileId)
    .eq('event_id', eventId)
    .single()
  
  if (error) {
    console.error('Error fetching application state:', error)
    return null
  }
  
  return data
}

export async function verifyApplicationExists(profileId: string, eventId: string): Promise<boolean> {
  const application = await getApplicationState(profileId, eventId)
  return application !== null && application.is_user_applied === true
}

export async function verifyApplicationCanceled(profileId: string, eventId: string): Promise<boolean> {
  const application = await getApplicationState(profileId, eventId)
  return application !== null && 
         application.is_user_applied === false && 
         application.cancellation_date !== null
}

export async function createTestApplication(profileId: string, eventId: string): Promise<void> {
  const supabase = createSupabaseAdminClient()
  
  // First check if an application already exists
  const existing = await getApplicationState(profileId, eventId)
  
  if (existing) {
    // Update existing application to be active
    const { error } = await supabase
      .from('event_participants')
      .update({
        is_user_applied: true,
        cancellation_date: null
      })
      .eq('id', existing.id)
    
    if (error) {
      throw new Error(`Failed to update application: ${error.message}`)
    }
  } else {
    // Create new application
    const { error } = await supabase
      .from('event_participants')
      .insert({
        profile_id: profileId,
        event_id: eventId,
        is_user_applied: true
      })
    
    if (error) {
      throw new Error(`Failed to create application: ${error.message}`)
    }
  }
}

export async function getProfileIdByEmail(email: string): Promise<string | null> {
  const supabase = createSupabaseAdminClient()
  
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single()
  
  if (error) {
    console.error('Error fetching profile ID:', error)
    return null
  }
  
  return data?.id || null
}

export async function getFirstOpenEvent(): Promise<{ id: string; title: string } | null> {
  const supabase = createSupabaseAdminClient()
  
  const { data, error } = await supabase
    .from('events')
    .select('id, title, event_status')
    .eq('event_status', 'Registration Open')
    .order('time_event_start', { ascending: true })
    .limit(1)
    .single()
  
  if (error) {
    console.error('Error fetching open event:', error)
    return null
  }
  
  return data ? { id: data.id, title: data.title || '' } : null
}

export async function ensureEventIsOpen(eventId: string): Promise<void> {
  const supabase = createSupabaseAdminClient()
  
  const { error } = await supabase
    .from('events')
    .update({
      event_status: 'Registration Open'
    })
    .eq('id', eventId)
  
  if (error) {
    throw new Error(`Failed to set event as open: ${error.message}`)
  }
}

export async function ensureTestUserProfileExists(): Promise<string> {
  // For E2E tests, we know the test user is created with a dynamic email
  // We need to find the most recently created test profile
  const supabase = createSupabaseAdminClient()
  
  // Get the most recent profile that was created in the last 5 minutes
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, email, user_id, basic_data_filled')
    .gte('created_at', fiveMinutesAgo)
    .order('created_at', { ascending: false })
    .limit(5)
  
  if (error) {
    throw new Error(`Failed to find test user profile: ${error.message}`)
  }
  
  if (!profiles || profiles.length === 0) {
    throw new Error('No recent test profiles found')
  }
  
  // Find the profile that matches our test pattern
  const testProfile = profiles.find(p => p.email?.includes('test-') && p.email?.includes('@example.com'))
  
  if (!testProfile) {
    throw new Error('Could not find matching test profile')
  }
  
  console.info('Found test profile:', testProfile.email)
  
  // Ensure the profile is onboarded
  if (!testProfile.basic_data_filled) {
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        basic_data_filled: true,
        full_name: 'Test E2E User',
        social_name: 'E2E Test',
        phone: 11999999999,
        gender: ['Mulher cis'],
        orientation: ['Hétero'],
        pronouns: ['Ela/dela'],
        date_of_birth: '1990-01-01',
        where_lives: 'São Paulo',
        how_came_to_us: 'E2E Tests'
      })
      .eq('id', testProfile.id)
    
    if (updateError) {
      throw new Error(`Failed to update profile: ${updateError.message}`)
    }
  }
  
  return testProfile.id
}