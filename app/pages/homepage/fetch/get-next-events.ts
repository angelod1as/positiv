import { PostgrestError } from "@supabase/supabase-js"
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
    starting_time,
    ending_time,
    event_status,
    application_open_time,
    interview_process_start,
    location,
    ticket_price,
    application_close_time,
    group_close_date,
    group_open_date,
    interview_process_end,
    payment_end_date,
    payment_start_date,
    active_applications: event_participants(user_applied_status)
    `,
  )

  if (profileId) {
    query = query.eq("event_participants.profile_id", profileId)
  }

  query = query
    .gte("starting_time", now)
    .in("event_status", ["Registration Open", "Scheduled"])
    .order("starting_time", { ascending: true })
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
          event.active_applications[0].user_applied_status,
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
