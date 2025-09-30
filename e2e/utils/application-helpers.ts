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
    .maybeSingle()
  
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
        is_user_applied: true,
        referred: 'ninguém'
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
    .maybeSingle()
  
  if (error) {
    console.error('Error fetching profile ID:', error)
    return null
  }
  
  return data?.id || null
}

export async function getOpenEvents(limit: number = 10): Promise<Array<{ id: string; title: string }>> {
  const supabase = createSupabaseAdminClient()
  
  const { data, error } = await supabase
    .from('events')
    .select('id, title')
    .eq('event_status', 'Registration Open')
    .order('created_at', { ascending: false })
    .limit(limit)
  
  if (error || !data) {
    console.error('Error fetching open events:', error)
    return []
  }
  
  return data.map(event => ({
    id: event.id,
    title: event.title || ''
  }))
}

export async function getFirstOpenEvent(): Promise<{ id: string; title: string } | null> {
  const supabase = createSupabaseAdminClient()
  
  // First try to get an existing open event - use maybeSingle() to handle 0 rows
  const { data, error } = await supabase
    .from('events')
    .select('id, title, event_status')
    .eq('event_status', 'Registration Open')
    .order('time_event_start', { ascending: true })
    .limit(1)
    .maybeSingle()
  
  if (!error && data) {
    return { id: data.id, title: data.title || '' }
  }
  
  // If no open event exists, create one for testing
  console.info('No open events found, creating test event...')
  return await createTestEvent()
}

async function createTestEvent(): Promise<{ id: string; title: string }> {
  const supabase = createSupabaseAdminClient()
  
  const futureDate = new Date()
  futureDate.setMonth(futureDate.getMonth() + 1)
  
  const eventData = {
    title: `E2E Test Event ${Date.now()}`,
    event_status: 'Registration Open' as const,
    time_event_start: futureDate.toISOString(),
    time_event_end: new Date(futureDate.getTime() + 3 * 60 * 60 * 1000).toISOString(), // 3 hours later
    time_application_start: new Date().toISOString(),
    time_application_end: futureDate.toISOString(),
    description: 'Automated test event for E2E testing',
    location: 'Test Location - São Paulo, SP',
    ticket_price: 50,
    total_spots: 65,
    event_type: 'regular' as const
  }
  
  const { data, error } = await supabase
    .from('events')
    .insert(eventData)
    .select('id, title')
    .single()
  
  if (error) {
    throw new Error(`Failed to create test event: ${error.message}`)
  }
  
  return { id: data.id, title: data.title || '' }
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

export async function createClosedEvent(): Promise<{ id: string; title: string }> {
  const supabase = createSupabaseAdminClient()
  
  // Future event but with registration closed
  const futureDate = new Date()
  futureDate.setMonth(futureDate.getMonth() + 1)
  
  const pastDate = new Date()
  pastDate.setDate(pastDate.getDate() - 1) // Registration ended yesterday
  
  const eventData = {
    title: `E2E Test Closed Event ${Date.now()}`,
    event_status: 'Registration Closed' as const,
    time_event_start: futureDate.toISOString(), // Event is in the future
    time_event_end: new Date(futureDate.getTime() + 3 * 60 * 60 * 1000).toISOString(),
    time_application_start: new Date(pastDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    time_application_end: pastDate.toISOString(), // Registration already ended
    description: 'Automated test event for E2E testing - closed',
    location: 'Test Location - São Paulo, SP',
    ticket_price: 50,
    total_spots: 65,
    event_type: 'regular' as const
  }
  
  const { data, error } = await supabase
    .from('events')
    .insert(eventData)
    .select('id, title')
    .single()
  
  if (error) {
    throw new Error(`Failed to create closed test event: ${error.message}`)
  }
  
  return { id: data.id, title: data.title || '' }
}

export async function ensureMultipleOpenEvents(count: number = 2): Promise<Array<{ id: string; title: string }>> {
  const existingEvents = await getOpenEvents(count)
  
  if (existingEvents.length >= count) {
    return existingEvents.slice(0, count)
  }
  
  const eventsToCreate = count - existingEvents.length
  const newEvents: Array<{ id: string; title: string }> = []
  
  for (let i = 0; i < eventsToCreate; i++) {
    const event = await createTestEvent()
    newEvents.push(event)
  }
  
  return [...existingEvents, ...newEvents]
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