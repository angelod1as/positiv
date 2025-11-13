import "dotenv/config"
import { composable, type Composable } from "composable-functions"
import { kysely } from "../../app/kysely"

/**
 * Get the ID of an active event from the database
 * Returns the first event with status 'Registration Open'
 */
type GetActiveEventId = Composable<() => string>

export const getActiveEventId: GetActiveEventId = composable(async () => {
  const event = await kysely
    .selectFrom("events")
    .select("id")
    .where("event_status", "=", "Registration Open")
    .limit(1)
    .executeTakeFirst()

  if (!event) {
    throw new Error("No active events found with status 'Registration Open'")
  }

  return event.id
})

// If run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  getActiveEventId()
    .then((result) => {
      if (result.success) {
        console.log(result.data)
        process.exit(0)
      } else {
        console.error("No active event found:", result.errors)
        process.exit(1)
      }
    })
    .catch((error) => {
      console.error("Fatal error:", error)
      process.exit(1)
    })
}
