import { randomBytes } from 'node:crypto'
import { createSupabaseAdminClient } from './db-cleanup'
import { runEventTitle } from './run-context'

/**
 * A closed event starting soon enough to reach the dashboard, which lists the
 * twelve nearest. Carries the run's own prefix so teardown claims it.
 */
export async function createClosedEventSoon(label: string): Promise<{ id: string; title: string }> {
  const supabase = createSupabaseAdminClient()

  const start = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)

  const { data, error } = await supabase
    .from('events')
    .insert({
      title: runEventTitle(label),
      event_status: 'Registration Closed',
      event_type: 'regular',
      time_event_start: start.toISOString(),
      time_event_end: new Date(start.getTime() + 3 * 60 * 60 * 1000).toISOString(),
      time_application_start: new Date().toISOString(),
      description: 'Test event for the invite flow',
      location: 'Test Location',
      total_spots: 100,
    })
    .select('id, title')
    .single()

  if (error || !data) {
    throw new Error(`Failed to create the closed invite event: ${error?.message}`)
  }

  return { id: data.id, title: data.title || '' }
}

export async function seedInvite(eventId: string, profileId: string): Promise<string> {
  const supabase = createSupabaseAdminClient()
  const token = randomBytes(24).toString('base64url')

  const { error } = await supabase
    .from('event_invites')
    .insert({ event_id: eventId, profile_id: profileId, token })

  if (error) throw new Error(`Failed to seed the invite: ${error.message}`)

  return token
}
