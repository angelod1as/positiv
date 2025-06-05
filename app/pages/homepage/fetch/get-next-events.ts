import { type PostgrestError } from "@supabase/supabase-js"
import type { EventStatus, ViewEvent } from "~types/entities.types"
import type { DBClient } from "~types/utils.types"

type GetNextEvents = (
  client: DBClient,
  profileId: string | undefined,
  limit?: number,
) => Promise<{
  events: ViewEvent[] | undefined
  error: PostgrestError | "NO_DATA_ERROR" | undefined | null
}>

export const getNextEvents: GetNextEvents = async (
  supabase,
  profileId,
  limit = 3,
) => {
  const now = new Date().toISOString()

  let query = supabase.from("events").select(
    `
    id,
    title,
    description,
    emoji,
    time_event_start,
    time_event_end,
    event_status,
    time_application_start,
    time_interviews_start,
    location,
    ticket_price,
    time_application_end,
    time_group_end,
    time_group_start,
    time_interviews_end,
    time_payment_start,
    time_payment_end,
    active_applications: event_participants(is_user_applied)
    `,
  )

  if (profileId) {
    query = query.eq("event_participants.profile_id", profileId)
  }

  query = query
    .gte("time_event_start", now)
    .in("event_status", [
      "Registration Open",
      "Scheduled",
      "Registration Closed",
    ])
    .order("time_event_start", { ascending: true })
    .limit(limit)

  const { data, error } = await query

  if (error) {
    return {
      events: [],
      error,
      profile: null,
    }
  }

  if (!data || data.length < 1) {
    return {
      events: [],
      error: "NO_DATA_ERROR",
      profile: null,
    }
  }

  if (profileId) {
    const events = data.map((event) => {
      return {
        ...event,
        event_status: event.event_status as EventStatus,
        is_applied:
          event.active_applications.length > 0 &&
          event.active_applications[0].is_user_applied,
        active_applications: [],
      }
    })

    return {
      events,
      error: undefined,
      profileId,
    }
  }

  const events = data.map((event) => ({
    ...event,
    event_status: event.event_status as EventStatus,
    is_applied: false,
    active_applications: [],
  }))

  return {
    events,
    error: undefined,
  }
}
