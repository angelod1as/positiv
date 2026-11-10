import { db } from "~/lib/supabase/db.server"

export const findUserApplication = async (eventId: string, profileId: string) =>
  db
    .selectFrom("event_participants")
    .select("id")
    .where("event_id", "=", eventId)
    .where("profile_id", "=", profileId)
    .where("is_user_applied", "=", true)
    .executeTakeFirst()
