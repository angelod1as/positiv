import { composable, type Composable } from "composable-functions"
import { kyselyDb } from "~/kysely-db"
import type { Event, EventStatus } from "~types/database/entities.types"

type GetNextEvents = Composable<
  (
    profileId: string | undefined,
    limit?: number,
    isHomepage?: boolean,
  ) => Event[]
>

export const getNextEvents: GetNextEvents = composable(
  async (profileId, limit = 3, isHomepage = false) => {
    const now = new Date().toISOString()

    const homepageStatus: EventStatus[] = ["Registration Open", "Scheduled"]
    const dashboardStatus: EventStatus[] = [
      "Registration Open",
      "Scheduled",
      "Registration Closed",
    ]

    const baseQuery = kyselyDb
      .selectFrom("events")
      .where("events.time_event_start", ">=", now)
      .where(
        "events.event_status",
        "in",
        isHomepage ? homepageStatus : dashboardStatus,
      )
      .orderBy("events.time_event_start", "asc")
      .limit(limit)

    if (profileId) {
      const data = await baseQuery
        .selectAll("events")
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
        // A closed event this person was invited into still shows them the
        // application. Read here rather than from a cookie, so the link opened
        // on a phone and the form filled on a desktop are the same person.
        .select((eb) =>
          eb
            .case()
            .when(
              eb.exists(
                eb
                  .selectFrom("event_invites")
                  .select("event_invites.id")
                  .whereRef("event_invites.event_id", "=", "events.id")
                  .where("event_invites.profile_id", "=", profileId)
                  .where("event_invites.revoked_at", "is", null),
              ),
            )
            .then(true)
            .else(false)
            .end()
            .as("is_invited"),
        )
        .execute()

      return data
    }

    // Nobody to hold an invite, so the shape is filled in rather than queried.
    const data = await baseQuery
      .selectAll("events")
      .select((eb) => eb.val<boolean>(false).as("is_invited"))
      .execute()
    return data
  },
)
