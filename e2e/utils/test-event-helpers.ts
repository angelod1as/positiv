import { createSupabaseAdminClient } from './db-cleanup'

type EventStatus = 'Draft' | 'Completed' | 'Cancelled' | 'Scheduled' | 'Registration Closed' | 'Registration Open'

export async function ensureMinimumOpenEvents(count: number = 2): Promise<{ id: string; title: string }[]> {
  const supabase = createSupabaseAdminClient()
  
  // Check existing open events
  const { data: existingEvents, error: fetchError } = await supabase
    .from('events')
    .select('id, title')
    .eq('event_status', 'Registration Open')
    .order('time_event_start', { ascending: true })
    .limit(count)
  
  if (fetchError) {
    throw new Error(`Failed to fetch open events: ${fetchError.message}`)
  }
  
  const currentCount = existingEvents?.length || 0
  const eventsToCreate = count - currentCount
  
  if (eventsToCreate <= 0) {
    return (existingEvents || []).map(e => ({ id: e.id, title: e.title || '' }))
  }
  
  // Create additional test events if needed
  const newEvents = []
  const now = new Date()
  
  for (let i = 0; i < eventsToCreate; i++) {
    const eventDate = new Date(now)
    eventDate.setDate(eventDate.getDate() + 30 + i) // Events 30+ days in future
    
    const testEvent = {
      title: `[E2E-TEST] Event ${Date.now()}-${i}`,
      event_status: 'Registration Open' as EventStatus,
      time_event_start: eventDate.toISOString(),
      time_event_end: new Date(eventDate.getTime() + 3 * 60 * 60 * 1000).toISOString(), // 3 hours later
      time_application_start: now.toISOString(),
      time_application_end: new Date(eventDate.getTime() - 24 * 60 * 60 * 1000).toISOString(), // Day before event
      description: 'Test event created for E2E testing',
      location: 'Test Location',
      total_spots: 100
    }
    
    const { data, error } = await supabase
      .from('events')
      .insert(testEvent)
      .select('id, title')
      .single()
    
    if (error) {
      console.error(`Failed to create test event ${i}:`, error)
      continue
    }
    
    if (data) {
      newEvents.push({ id: data.id, title: data.title || '' })
    }
  }
  
  // Return all open events
  const existingEventsFormatted = (existingEvents || []).map(e => ({ id: e.id, title: e.title || '' }))
  const allEvents = [...existingEventsFormatted, ...newEvents]
  return allEvents.slice(0, count)
}

export async function ensureClosedTestEvent(): Promise<{ id: string; title: string }> {
  const supabase = createSupabaseAdminClient()
  
  // Check for existing closed test event
  const { data: existingClosed, error: fetchError } = await supabase
    .from('events')
    .select('id, title')
    .eq('event_status', 'Registration Closed')
    .like('title', '[E2E-TEST]%')
    .limit(1)
    .single()
  
  if (!fetchError && existingClosed) {
    return { id: existingClosed.id, title: existingClosed.title || '' }
  }
  
  // Create a closed test event
  const now = new Date()
  const pastDate = new Date(now)
  pastDate.setDate(pastDate.getDate() - 10) // Event 10 days ago
  
  const closedEvent = {
    title: `[E2E-TEST] Closed Event ${Date.now()}`,
    event_status: 'Registration Closed' as EventStatus,
    time_event_start: pastDate.toISOString(),
    time_event_end: new Date(pastDate.getTime() + 3 * 60 * 60 * 1000).toISOString(),
    time_application_start: new Date(pastDate.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    time_application_end: new Date(pastDate.getTime() - 24 * 60 * 60 * 1000).toISOString(),
    description: 'Test closed event for E2E testing',
    location: 'Test Location',
    total_spots: 100
  }
  
  const { data, error } = await supabase
    .from('events')
    .insert(closedEvent)
    .select('id, title')
    .single()
  
  if (error) {
    throw new Error(`Failed to create closed test event: ${error.message}`)
  }
  
  return { id: data.id, title: data.title || '' }
}