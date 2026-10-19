import { kyselyDb } from "~/kysely-db"

// Every status except Draft is reachable by an authenticated person, the same
// as the rules page already is: the real gate is applyToEvent on the server.
// Draft is an unpublished event and is hidden everywhere outside the admin
// dashboard, so it is the one status excluded here. A new status added later is
// visible by default — exclude it here too if it should not be.
export const findVisibleEvent = (id: string) =>
  kyselyDb
    .selectFrom("events")
    .select(["id", "event_status"])
    .where("id", "=", id)
    .where("event_status", "!=", "Draft")
    .executeTakeFirst()
