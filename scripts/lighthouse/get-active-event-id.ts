import { kysely } from "../../app/kysely"

/**
 * Get the ID of an active event from the database
 * Returns the first event with status 'Registration Open'
 */
export async function getActiveEventId(): Promise<string | null> {
  try {
    const event = await kysely
      .selectFrom("events")
      .select("id")
      .where("event_status", "=", "Registration Open")
      .limit(1)
      .executeTakeFirst()

    if (!event) {
      console.warn("No active events found with status 'Registration Open'")
      return null
    }

    return event.id
  } catch (error) {
    console.error("Error fetching active event ID:", error)
    return null
  }
}

// If run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  getActiveEventId()
    .then((id) => {
      if (id) {
        console.log(id)
        process.exit(0)
      } else {
        console.error("No active event found")
        process.exit(1)
      }
    })
    .catch((error) => {
      console.error("Fatal error:", error)
      process.exit(1)
    })
}
