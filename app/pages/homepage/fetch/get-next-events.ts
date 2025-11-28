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
      query = query
        .leftJoin("event_participants", (join) =>
          join
            .onRef("event_participants.event_id", "=", "events.id")
            .on("event_participants.profile_id", "=", profileId)
            .on("event_participants.is_user_applied", "=", true),
        )
        .select((eb) =>
          eb
            .case()
            .when("event_participants.id", "is not", null)
            .then(true)
            .else(false)
            .end()
            .as("is_applied"),
        )
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
