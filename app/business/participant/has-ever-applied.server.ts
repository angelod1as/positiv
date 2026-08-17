import { kyselyDb } from "~/kysely-db"

export const hasEverApplied = async (profileId: string): Promise<boolean> => {
  const row = await kyselyDb
    .selectFrom("event_participants")
    .select("id")
    .where("profile_id", "=", profileId)
    .limit(1)
    .executeTakeFirst()

  return Boolean(row)
}
