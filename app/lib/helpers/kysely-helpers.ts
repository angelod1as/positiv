import { sql, type RawBuilder } from "kysely"

/**
 * Helper to properly cast JavaScript objects to PostgreSQL JSONB type.
 *
 * Use this instead of JSON.stringify() when setting jsonb column values
 * to ensure proper type handling and avoid double-escaping issues.
 *
 * @example
 * await db
 *   .updateTable("my_table")
 *   .set({
 *     metadata: json({ key: "value" })
 *   })
 *   .execute()
 */
export function json<T>(object: T): RawBuilder<T> {
  return sql`${JSON.stringify(object)}::jsonb`
}
