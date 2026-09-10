import { composable } from "composable-functions"
import { cancelActivePayment } from "~/business/payment/payment-offer.server"
import { kyselyDb } from "~/kysely-db"
import { dateToString } from "~/lib/helpers/date-to-string"
import { logger } from "~/lib/logger/logger.server"

type CancelApplicationToEventProps = { profileId?: string; eventId?: string }

// By design, a cancellation never reopens an event that the participant limit
// trigger closed: the freed spot is filled by the admins, not by whoever
// refreshes the dashboard first.
export const cancelApplicationToEvent = composable(
  async ({ profileId, eventId }: CancelApplicationToEventProps) => {
    if (!profileId || !eventId) {
      throw new Error("Algo deu errado no seu cancelamento. Tente mais tarde.")
    }

    const withdrawn = await kyselyDb
      .updateTable("event_participants")
      .set({
        is_user_applied: false,
        cancellation_date: dateToString(new Date()),
      })
      .where("event_id", "=", eventId)
      .where("profile_id", "=", profileId)
      .where("is_user_applied", "=", true)
      .returning("id")
      .execute()

    // No live charge survives a withdrawal. A paid one is left alone: giving
    // the money back is a separate decision, taken by an admin.
    //
    // Swallowed on purpose. The person asked to leave, and an Asaas outage or
    // a charge that changed under us is not a reason to refuse them.
    for (const participant of withdrawn) {
      try {
        await cancelActivePayment({ eventParticipantId: participant.id })
      } catch (error) {
        logger.error("Could not call off the charge of a withdrawn application", {
          eventParticipantId: participant.id,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    return withdrawn
  },
)
