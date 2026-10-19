import { kyselyDb } from "~/kysely-db"

export const findVisibleEvent = (id: string) =>
  kyselyDb
    .selectFrom("events")
    .select("id")
    .where("id", "=", id)
    .where("event_status", "!=", "Draft")
    .executeTakeFirst()
