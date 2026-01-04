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

    // Filter out participants without email
    const validParticipants = participants.filter((p) => p.email !== null)

    // Format email template once (same for all recipients)
    const { html, text } = await formatGroupClosingMail(event)
    const emailSubject = `Seleção encerrada - ${event.emoji || ""} ${event.title}`.trim()

    // Send emails in batches of 20 for parallel processing
    const BATCH_SIZE = 20
    let successCount = 0
    let failureCount = 0
    const errors: string[] = []

    for (let i = 0; i < validParticipants.length; i += BATCH_SIZE) {
      const batch = validParticipants.slice(i, i + BATCH_SIZE)

      const emailPromises = batch.map(async (participant) => {
        if (!participant.email) {
          return {
            email: "unknown",
            success: false,
            error: "Email address is null",
          }
        }

        const options: MailOptions = {
          to: participant.email,
          subject: emailSubject,
          text: text,
          html: html,
        }

        const result = await sendEmail(options)
        return {
          email: participant.email,
          success: result.success,
          error: result.success
            ? null
            : result.errors?.[0]?.message || "Unknown error",
        }
      })

      const results = await Promise.allSettled(emailPromises)

      // Process batch results
      results.forEach((result) => {
        if (result.status === "fulfilled") {
          if (result.value.success) {
            successCount++
          } else {
            failureCount++
            errors.push(
              `Failed to send to ${result.value.email}: ${result.value.error}`,
            )
          }
        } else {
          // Promise rejected (shouldn't happen with our try-catch, but defensive)
          failureCount++
          errors.push(`Unexpected error: ${result.reason}`)
        }
      })
    }

    // Update tracking based on results
    if (failureCount === 0) {
      // All emails sent successfully (or no participants)
      await updateGroupClosingSent(eventId, validParticipants.length)
      return validParticipants.length
    } else if (successCount > 0) {
      // Partial success - some emails sent, some failed
      const errorData = {
        step: "email_send",
        message: `Sent ${successCount}/${validParticipants.length} emails. Errors: ${errors.join("; ")}`,
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
