import { PostgrestError } from "@supabase/supabase-js"
import { getCurrentProfile } from "~/lib/supabase/fetch/get-current-profile"
import type {
  EventStatus,
  ProfileWithRoles,
  ViewEvent,
} from "~types/entities.types"
import type { DBClient } from "~types/utils.types"

export type HomePageViewEvent = Pick<
  ViewEvent,
  | "id"
  | "title"
  | "description"
  | "emoji"
  | "starting_time"
  | "ending_time"
  | "application_open_time"
  | "is_applied"
  | "event_status"
>

type GetHomepageNextEvents = (client: DBClient) => Promise<{
  events: HomePageViewEvent[] | undefined
  error: PostgrestError | "NO_DATA_ERROR" | undefined | null
  profile: ProfileWithRoles | undefined
}>

export const getHomepageNextEvents: GetHomepageNextEvents = async (
  supabase,
) => {
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
    application_open_time,
    event_status,
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
    .limit(3)

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
