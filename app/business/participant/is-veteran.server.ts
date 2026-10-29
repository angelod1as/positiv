import { kyselyDb } from "~/kysely-db"

/**
 * Whether the person is a veteran — `profiles.is_veteran`, set once they
 * attended a party or by an admin by hand. The same flag the admin tables show.
 */
export const isVeteran = async (profileId: string): Promise<boolean> => {
  const row = await kyselyDb
    .selectFrom("profiles")
    .select("is_veteran")
    .where("id", "=", profileId)
    .executeTakeFirst()

  return row?.is_veteran ?? false
}
