import { composable, type Composable } from "composable-functions"
import { kysely } from "~/kysely"
import type { EventStatus, ViewEvent } from "~types/database/entities.types"

type GetNextEvents = Composable<
  (
    profileId: string | undefined,
    limit?: number,
    isHomepage?: boolean,
  ) => ViewEvent[]
>

export const getNextEvents: GetNextEvents = composable(
  async (profileId, limit = 3, isHomepage = false) => {
    const now = new Date().toISOString()

    let query = kysely.selectFrom("events").selectAll("events")

    if (profileId) {
      query = query.select((eb) => [
        eb
          .exists(
            eb
              .selectFrom("event_participants")
              .select("event_participants.event_id")
              .whereRef("event_participants.event_id", "=", "events.id")
              .where("event_participants.profile_id", "=", profileId)
              .where("is_user_applied", "=", true),
          )
          .as("is_applied"),
        eb
          .exists(
            eb
              .selectFrom("event_reminders")
              .select("event_reminders.event_id")
              .whereRef("event_reminders.event_id", "=", "events.id")
              .where("event_reminders.profile_id", "=", profileId),
          )
          .as("is_set_reminder"),
      ])
    }

    const homepageStatus: EventStatus[] = ["Registration Open", "Scheduled"]
    const dashboardStatus: EventStatus[] = [
      "Registration Open",
      "Scheduled",
      "Registration Closed",
    ]

    query = query
      .where("events.time_event_start", ">=", now)
      .where(
        "events.event_status",
        "in",
        isHomepage ? homepageStatus : dashboardStatus,
      )
      .orderBy("events.time_event_start", "asc")
      .limit(limit)

    const data = await query.execute()

    return data
  },
)
