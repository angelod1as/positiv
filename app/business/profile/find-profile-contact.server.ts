import { db } from "~/lib/supabase/db.server"

export const findProfileContact = async (profileId: string) =>
  db
    .selectFrom("profiles")
    .select(["email", "full_name", "social_name"])
    .where("id", "=", profileId)
    .executeTakeFirstOrThrow()
