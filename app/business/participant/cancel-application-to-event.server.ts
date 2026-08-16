import { composable } from "composable-functions"
import { kyselyDb } from "~/kysely-db"
import { dateToString } from "~/lib/helpers/date-to-string"

type CancelApplicationToEventProps = { profileId?: string; eventId?: string }

// By design, a cancellation never reopens an event that the participant limit
// trigger closed: the freed spot is filled by the admins, not by whoever
// refreshes the dashboard first.
export const cancelApplicationToEvent = composable(
  async ({ profileId, eventId }: CancelApplicationToEventProps) => {
    if (!profileId || !eventId) {
      throw new Error("Algo deu errado no seu cancelamento. Tente mais tarde.")
    }

    return await kyselyDb
      .updateTable("event_participants")
      .set({
        is_user_applied: false,
        cancellation_date: dateToString(new Date()),
      })
      .where("event_id", "=", eventId)
      .where("profile_id", "=", profileId)
      .where("is_user_applied", "=", true)
      .execute()
  },
)
