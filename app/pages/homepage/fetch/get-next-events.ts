import { PostgrestError } from "@supabase/supabase-js"
import { getCurrentProfile } from "~/lib/supabase/fetch/get-current-profile"
import type {
  EventStatus,
  ProfileWithRoles,
  ViewEvent,
} from "~types/entities.types"
import type { DBClient } from "~types/utils.types"

type GetNextEvents = (
  client: DBClient,
  limit?: number,
) => Promise<{
  events: ViewEvent[] | undefined
  error: PostgrestError | "NO_DATA_ERROR" | undefined | null
  profile: ProfileWithRoles | undefined
}>

export const getNextEvents: GetNextEvents = async (supabase, limit = 3) => {
  const now = new Date().toISOString()
  const profile = await getCurrentProfile(supabase)

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

  if (profile) {
    query = query.eq("event_participants.profile_id", profile.id)
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
      profile: undefined,
    }
  }

  if (!data || data.length < 1) {
    return {
      events: [],
      error: "NO_DATA_ERROR",
      profile: undefined,
    }
  }

  if (profile) {
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
      profile,
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
    profile,
  }
}
