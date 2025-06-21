import { PostgrestError } from "@supabase/supabase-js"
import { createSupabaseTestClient } from "./create-supabase-client"

export async function createMockEventReminders() {
  const supabase = await createSupabaseTestClient()

  // Delete all existing reminders
  const { data: reminderData, error: reminderError } = await supabase
    .from("event_reminders")
    .select("id")

  if (reminderError) throw new PostgrestError(reminderError)

  const { error: deleteError } = await supabase
    .from("event_reminders")
    .delete()
    .in(
      "id",
      reminderData.map((item) => item.id),
    )

  if (deleteError) throw new PostgrestError(deleteError)
  console.info("Delete completed")

  // Get profile IDs for user1@example.com through user9@example.com
  const userEmails = [
    "user1@example.com",
    "user2@example.com",
    "user3@example.com",
    "user4@example.com",
    "user5@example.com",
    "user6@example.com",
    "user7@example.com",
    "user8@example.com",
    "user9@example.com",
  ]
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, user_id, email")
    .in("email", userEmails)

  if (profilesError) throw profilesError
  if (!profiles) throw new Error("No profiles found for seed users.")

  // Map emails to profile IDs
  const emailToProfileId: Record<string, string> = {}
  for (const email of userEmails) {
    const profile = profiles.find((p) => p.email === email)
    if (!profile) throw new Error(`Profile not found for ${email}`)
    emailToProfileId[email] = profile.id
  }

  // Get event IDs for the 5 event titles
  const eventTitles = [
    "Evento Agendado 1",
    "Evento Com Inscrições Abertas 1",
    "Evento Com Inscrições Abertas 2",
    "Evento Concluído 1",
    "Evento Com Inscrições Fechadas 1",
  ]
  const { data: events, error: eventsError } = await supabase
    .from("events")
    .select("id, title")
    .in("title", eventTitles)

  if (eventsError) throw eventsError
  if (!events) throw new Error("No events found for seed titles.")

  // Map titles to event IDs
  const titleToEventId: Record<string, string> = {}
  for (const title of eventTitles) {
    const event = events.find((e) => e.title === title)
    if (!event) throw new Error(`Event not found for ${title}`)
    titleToEventId[title] = event.id
  }

  // Build reminders as in the SQL seed
  const reminders = [
    // Reminder TRUE for a Scheduled event (reminder = row exists, email_sent = false)
    {
      event_id: titleToEventId["Evento Agendado 1"],
      profile_id: emailToProfileId["user2@example.com"],
      email_sent: false,
    },
    // Reminder FALSE for a Completed event (simulate opt-out, email_sent = false)
    {
      event_id: titleToEventId["Evento Concluído 1"],
      profile_id: emailToProfileId["user2@example.com"],
      email_sent: false,
    },
    // Reminder TRUE for a Registration Open event and with the email sent FALSE
    ...userEmails.map((email) => ({
      event_id: titleToEventId["Evento Com Inscrições Abertas 1"],
      profile_id: emailToProfileId[email],
      email_sent: false,
    })),
    // Reminder TRUE for a Registration Open event and with the email sent TRUE (and a fake date)
    {
      event_id: titleToEventId["Evento Com Inscrições Abertas 2"],
      profile_id: emailToProfileId["user2@example.com"],
      email_sent: true,
      email_sent_date: "2024-06-01T10:00:00Z",
    },
    // Reminder TRUE for a Registration Closed event (email_sent = false)
    {
      event_id: titleToEventId["Evento Com Inscrições Fechadas 1"],
      profile_id: emailToProfileId["user2@example.com"],
      email_sent: false,
    },
  ]

  // Insert reminders
  const { error: insertError } = await supabase
    .from("event_reminders")
    .insert(reminders)

  if (insertError) {
    throw insertError
  }

  return reminders.length
}
