import { composable } from "composable-functions"
import { cancelActivePayment } from "~/business/payment/payment-offer.server"
import { kyselyDb } from "~/kysely-db"
import { dateToString } from "~/lib/helpers/date-to-string"
import { logger } from "~/lib/logger/logger.server"
import { cancellationReasonSchema } from "./cancellation-reason-schema"
import {
  findParticipantCancellation,
  notifyParticipantCancellation,
} from "./notify-participant-cancellation.server"

type CancelApplicationToEventProps = {
  profileId?: string
  eventId?: string
  reason?: string
}

// By design, a cancellation never reopens an event that the participant limit
// trigger closed: the freed spot is filled by the admins, not by whoever
// refreshes the dashboard first.
export const cancelApplicationToEvent = composable(
  async ({ profileId, eventId, reason }: CancelApplicationToEventProps) => {
    if (!profileId || !eventId) {
      throw new Error("Algo deu errado no seu cancelamento. Tente mais tarde.")
    }

    const cancellationReason = cancellationReasonSchema.parse(reason)

    const withdrawn = await kyselyDb
      .updateTable("event_participants")
      .set({
        is_user_applied: false,
        cancellation_date: dateToString(new Date()),
        cancellation_reason: cancellationReason,
      })
      .where("event_id", "=", eventId)
      .where("profile_id", "=", profileId)
      .where("is_user_applied", "=", true)
      // A paid participant cancels by talking to the team, so the money is
      // settled in the same conversation. Checked in the update itself, so a
      // payment confirmed mid-request cannot slip through.
      .where(({ not, exists, selectFrom }) =>
        not(
          exists(
            selectFrom("event_participant_payments")
              .select("event_participant_payments.event_participant_id")
              .whereRef(
                "event_participant_payments.event_participant_id",
                "=",
                "event_participants.id",
              )
              .where("event_participant_payments.has_paid", "=", true),
          ),
        ),
      )
      .returning("id")
      .execute()

    if (withdrawn.length === 0) {
      const paid = await kyselyDb
        .selectFrom("event_participants")
        .innerJoin(
          "event_participant_payments",
          "event_participant_payments.event_participant_id",
          "event_participants.id",
        )
        .select("event_participants.id")
        .where("event_participants.event_id", "=", eventId)
        .where("event_participants.profile_id", "=", profileId)
        .where("event_participants.is_user_applied", "=", true)
        .where("event_participant_payments.has_paid", "=", true)
        .executeTakeFirst()

      if (paid) {
        throw new Error(
          "A paid registration cannot be cancelled by the participant",
        )
      }
    }

    // No live charge survives a withdrawal.
    //
    // Swallowed on purpose. The person asked to leave, and a provider outage or
    // a charge that changed under us is not a reason to refuse them.
    for (const participant of withdrawn) {
      try {
        await cancelActivePayment({ eventParticipantId: participant.id })
      } catch (error) {
        logger.error(
          "Could not call off the charge of a withdrawn application",
          {
            eventParticipantId: participant.id,
            error: error instanceof Error ? error.message : String(error),
          },
        )
      }

      // Swallowed for the same reason: the editors hearing about it late is
      // better than the participant not being able to leave.
      try {
        const cancellation = await findParticipantCancellation(participant.id)
        if (cancellation) await notifyParticipantCancellation(cancellation)
      } catch (error) {
        logger.error("Could not notify the editors of a cancellation", {
          eventParticipantId: participant.id,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    return withdrawn
  },
)
