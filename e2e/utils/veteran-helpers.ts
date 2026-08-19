import { createSupabaseAdminClient } from './db-cleanup'
import { runEventTitle } from './run-context'

/**
 * Gives a profile the one thing the rules quiz asks about: a past edition they
 * actually went to. The event is created here rather than reused, so the test
 * owns both rows and can take them away again — a profile left as a veteran
 * would shorten the quiz for every test that runs after it.
 */
export async function markProfileAsVeteran(
  profileId: string
): Promise<{ eventId: string }> {
  const supabase = createSupabaseAdminClient()

  const start = new Date()
  start.setDate(start.getDate() - 60)

  const { data: event, error: eventError } = await supabase
    .from('events')
    .insert({
      title: runEventTitle(`Past ${Date.now()}`),
      event_status: 'Completed',
      event_type: 'regular',
      time_event_start: start.toISOString(),
      time_event_end: new Date(start.getTime() + 3 * 60 * 60 * 1000).toISOString(),
      description: 'Past event created for E2E testing',
      location: 'Test Location',
      total_spots: 100,
    })
    .select('id')
    .single()

  if (eventError || !event) {
    throw new Error(`Failed to create a past test event: ${eventError?.message}`)
  }

  const { error: participantError } = await supabase
    .from('event_participants')
    .insert({
      profile_id: profileId,
      event_id: event.id,
      is_user_applied: true,
      attendance_status: 'attended',
      application_status: 'finalised',
      referred: 'ninguém',
    })

  if (participantError) {
    throw new Error(
      `Failed to record a past attendance: ${participantError.message}`
    )
  }

  return { eventId: event.id }
}

export async function clearVeteranHistory(
  profileId: string,
  eventId: string
): Promise<void> {
  const supabase = createSupabaseAdminClient()

  await supabase
    .from('event_participants')
    .delete()
    .eq('profile_id', profileId)
    .eq('event_id', eventId)

  await supabase.from('events').delete().eq('id', eventId)
}
