import { createSupabaseAdminClient } from './db-cleanup'
import { runEventTitle } from './run-context'

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
      title: runEventTitle(`Event ${Date.now()}-${i}`),
      event_status: 'Registration Open' as EventStatus,
      time_event_start: eventDate.toISOString(),
      time_event_end: new Date(eventDate.getTime() + 3 * 60 * 60 * 1000).toISOString(), // 3 hours later
      time_application_start: now.toISOString(),
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

/**
 * A regular event of its own, so a test that needs the rules quiz is not handed
 * a BDSM event — that route asks for consent instead of running the quiz.
 */
export async function createOpenRegularEvent(): Promise<{ id: string; title: string }> {
  const supabase = createSupabaseAdminClient()

  const now = new Date()
  const eventDate = new Date(now)
  eventDate.setDate(eventDate.getDate() + 45)

  const { data, error } = await supabase
    .from('events')
    .insert({
      title: runEventTitle(`Regular event ${Date.now()}`),
      event_status: 'Registration Open' as EventStatus,
      event_type: 'regular',
      time_event_start: eventDate.toISOString(),
      time_event_end: new Date(eventDate.getTime() + 3 * 60 * 60 * 1000).toISOString(),
      time_application_start: now.toISOString(),
      description: 'Test event created for E2E testing',
      location: 'Test Location',
      total_spots: 100,
    })
    .select('id, title')
    .single()

  if (error || !data) {
    throw new Error(`Failed to create a regular test event: ${error?.message}`)
  }

  return { id: data.id, title: data.title || '' }
}
