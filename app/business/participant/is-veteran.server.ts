import { kyselyDb } from "~/kysely-db"

/**
 * Whether the person has been to a Positiv before — the same count the admin
 * tables show as `attended_events_count`, asked about one person and one event.
 *
 * The event being applied to is left out: someone can be marked as attending it
 * before it happens, and that is not a past edition.
 */
export const isVeteran = async (
  profileId: string,
  eventId: string,
): Promise<boolean> => {
  const row = await kyselyDb
    .selectFrom("event_participants")
    .innerJoin("events", "event_participants.event_id", "events.id")
    .select("event_participants.id")
    .where("event_participants.profile_id", "=", profileId)
    .where("event_participants.attendance_status", "=", "attended")
    .where("event_participants.application_status", "=", "finalised")
    .where("events.event_status", "!=", "Cancelled")
    .where("event_participants.event_id", "!=", eventId)
    .limit(1)
    .executeTakeFirst()

  return Boolean(row)
}
