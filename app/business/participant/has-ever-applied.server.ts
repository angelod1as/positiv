import { kyselyDb } from "~/kysely-db"

// Deliberately unfiltered by is_user_applied: cancelling keeps the row and only
// flips that flag, and someone who applied once and cancelled has understood
// that registering for an event is a separate step.
export const hasEverApplied = async (profileId: string): Promise<boolean> => {
  const row = await kyselyDb
    .selectFrom("event_participants")
    .select("id")
    .where("profile_id", "=", profileId)
    .limit(1)
    .executeTakeFirst()

  return Boolean(row)
}
