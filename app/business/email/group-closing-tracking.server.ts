import { composable } from "composable-functions"
import { kysely } from "~/kysely"
import { json } from "~/lib/helpers/kysely-helpers"

type GroupClosingErrorData = {
  step: string
  message: string
  timestamp: string
}

export const createGroupClosingTracking = composable(async (eventId: string) => {
  await kysely
    .insertInto("event_transactional_emails")
    .values({
      event_id: eventId,
      email_type: "group_closing",
      emails_sent: false,
      times_attempted: 0,
    })
    .onConflict((oc) =>
      oc.columns(["event_id", "email_type"]).doNothing(),
    )
    .execute()

  return true
})

export const getPendingGroupClosingEmails = composable(async () => {
  const emails = await kysely
    .selectFrom("event_transactional_emails")
    .selectAll()
    .where("email_type", "=", "group_closing")
    .where("emails_sent", "=", false)
    .where("times_attempted", "<", 3)
    .execute()

  return emails
})

export const updateGroupClosingSent = composable(
  async (eventId: string, recipientCount: number) => {
    await kysely
      .updateTable("event_transactional_emails")
      .set({
        emails_sent: true,
        sent_time: new Date().toISOString(),
        recipient_count: recipientCount,
        updated_at: new Date().toISOString(),
      })
      .where("event_id", "=", eventId)
      .where("email_type", "=", "group_closing")
      .execute()

    return true
  },
)

export const updateGroupClosingError = composable(
  async (eventId: string, errorData: GroupClosingErrorData) => {
    await kysely
      .updateTable("event_transactional_emails")
      .set((eb) => ({
        times_attempted: eb("times_attempted", "+", 1),
        last_attempt: new Date().toISOString(),
        last_error: json(errorData),
        updated_at: new Date().toISOString(),
      }))
      .where("event_id", "=", eventId)
      .where("email_type", "=", "group_closing")
      .execute()

    return true
  },
)
