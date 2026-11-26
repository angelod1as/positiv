import { createOrUpdateEvent, updateEventStatus } from '../../app/business/event/event.server'
import { calculateDerivedDates } from '../../app/components/forms/admin/calculate-derived-dates'
import type { EventStatus } from '~types/database/entities.types'
import { createSupabaseAdminClient } from './db-cleanup'
import { runEventTitle } from './run-context'

// The admin's session, as the event routes hand it to the business functions.
// They write through Kysely and never touch the Supabase client.
export function adminContext(eventId?: string) {
  return {
    supabase: undefined as never,
    supabaseHeaders: new Headers(),
    currentUser: { id: '00000000-0000-4000-8000-000000000001' },
    currentProfile: {
      id: '00000000-0000-4000-8000-000000000002',
      basic_data_filled: true,
      created_at: new Date().toISOString(),
      permissions: ['admin.panel', 'events.manage'],
    },
    host: null,
    eventId,
  }
}

// What the admin types into the event form, dates filled by the same
// calculation as its "calculate dates" button.
export function adminEventFormValues(title: string, start: Date) {
  const dates = Object.fromEntries(
    Object.entries(calculateDerivedDates(start.toISOString())).map(([field, value]) => [
      field,
      new Date(value).toISOString(),
    ]),
  ) as ReturnType<typeof calculateDerivedDates>

  return {
    title,
    emoji: '🎉',
    location: 'Test Location',
    ticket_price: '100',
    total_spots: '50',
    ...dates,
  }
}

// Goes through the function the admin's event form calls, so the event a test
// starts from is the row the form itself would write.
export async function createEventAsAdmin(
  label: string,
  daysAhead = 60,
): Promise<{ id: string; title: string }> {
  const title = runEventTitle(label)
  const start = new Date()
  start.setDate(start.getDate() + daysAhead)
  start.setHours(20, 0, 0, 0)

  const result = await createOrUpdateEvent(adminEventFormValues(title, start), adminContext())

  if (!result.success) {
    throw new Error(`Failed to create an event: ${result.errors.map((e) => e.message).join(', ')}`)
  }

  return { id: result.data, title }
}

// The status select on the event page calls this same function.
export async function setEventStatusAsAdmin(eventId: string, status: EventStatus): Promise<void> {
  const result = await updateEventStatus({ event_status: status }, adminContext(eventId))

  if (!result.success || !result.data) {
    throw new Error(`Failed to move event ${eventId} to ${status}`)
  }
}

export async function findSeedEventId(title: string): Promise<string> {
  const { data, error } = await createSupabaseAdminClient()
    .from('events')
    .select('id')
    .eq('title', title)
    .single()

  if (error || !data) throw new Error(`No seed event "${title}": ${error?.message}`)

  return data.id
}

export async function findSeedProfileId(email: string): Promise<string> {
  const { data, error } = await createSupabaseAdminClient()
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single()

  if (error || !data) throw new Error(`No seed profile "${email}": ${error?.message}`)

  return data.id
}
