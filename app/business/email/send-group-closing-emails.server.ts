import { composable } from "composable-functions"
import { kysely } from "~/kysely"
import { formatGroupClosingMail } from "./format-group-closing-mail"
import { type MailOptions, sendEmail } from "./send-email"
import {
  updateGroupClosingSent,
  updateGroupClosingError,
} from "./group-closing-tracking.server"

/**
 * Send group closing emails to all non-rejected participants of an event
 * Called by process-campaigns API when time_group_start is reached
 * SECURITY: Only sends to approved_to_attend != 'rejected' AND email IS NOT NULL
 */
export const sendGroupClosingEmailsForEvent = composable(
  async (eventId: string) => {
    let participants
    let event

    try {
      // Query all non-rejected participants with non-null email
      participants = await kysely
        .selectFrom("event_participants as ep")
        .innerJoin("profiles as p", "ep.profile_id", "p.id")
        .select([
          "p.id",
          "p.email",
          "p.social_name",
          "p.full_name",
          "p.approved_to_attend",
        ])
        .where("ep.event_id", "=", eventId)
        .where("p.approved_to_attend", "!=", "rejected")
        .where("p.email", "is not", null)
        .execute()

      // Get event details
      event = await kysely
        .selectFrom("events")
        .selectAll()
        .where("id", "=", eventId)
        .executeTakeFirstOrThrow()
    } catch (error) {
      // Database query errors
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error"
      const errorData = {
        step: "query_participants",
        message: errorMessage,
        timestamp: new Date().toISOString(),
      }
      await updateGroupClosingError(eventId, errorData)
      throw error
    }

    // Send emails to each participant
    let successCount = 0
    let failureCount = 0
    const errors: string[] = []

    for (const participant of participants) {
      try {
        if (!participant.email) {
          continue
        }

        const { html, text } = await formatGroupClosingMail(event)

        const options: MailOptions = {
          to: participant.email,
          subject: `Fechamos o grupo - ${event.emoji || ""} ${event.title}`.trim(),
          text: text,
          html: html,
        }

        const result = await sendEmail(options)

        if (result.success) {
          successCount++
        } else {
          failureCount++
          const errorMessage =
            result.errors?.[0]?.message || "Unknown error"
          errors.push(`Failed to send to ${participant.email}: ${errorMessage}`)
        }
      } catch (error) {
        failureCount++
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error"
        errors.push(`Failed to send to ${participant.email}: ${errorMessage}`)
      }
    }

    // Update tracking based on results
    if (failureCount === 0) {
      // All emails sent successfully (or no participants)
      await updateGroupClosingSent(eventId, participants.length)
      return participants.length
    } else if (successCount > 0) {
      // Partial success - some emails sent, some failed
      const errorData = {
        step: "email_send",
        message: `Sent ${successCount}/${participants.length} emails. Errors: ${errors.join("; ")}`,
        timestamp: new Date().toISOString(),
      }
      await updateGroupClosingError(eventId, errorData)
      throw new Error(errorData.message)
    } else {
      // Complete failure - no emails sent
      const errorData = {
        step: "email_send",
        message: `Failed to send all emails. Errors: ${errors.join("; ")}`,
        timestamp: new Date().toISOString(),
      }
      await updateGroupClosingError(eventId, errorData)
      throw new Error(errorData.message)
    }
  },
)
