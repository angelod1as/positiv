import { Pool } from "pg"
import dotenv from "dotenv"
import path from "path"

// Tables to snapshot before tests and restore afterwards, in FK-dependency order for INSERT.
// Ordered so that referenced tables come before referencing tables.
const TABLES = [
  "profiles",                   // seeded; wiped by kpi-scores (no WHERE)
  "user_roles",                 // seeded; references auth.users, not profiles
  "events",                     // seeded; referenced by event_participants, payment_transactions
  "event_participants",         // seeded; wiped by kpi-scores and dataviz (no WHERE)
  "payment_transactions",       // wiped by kpi-scores and dataviz (no WHERE)
  "event_demographics_history", // wiped by demographics-history (no WHERE)
  "newsletter_subscriptions",   // seeded; cascade-deleted when profiles are deleted
]

export default async function setup() {
  dotenv.config({ path: path.resolve(process.cwd(), ".env") })

  const connectionString = process.env.SUPABASE_CONNECT_URL
  if (!connectionString) throw new Error("SUPABASE_CONNECT_URL is not set")

  const pool = new Pool({ connectionString })
  const client = await pool.connect()

  try {
    // Drop stale backups from any previous failed run
    for (const table of TABLES) {
      await client.query(`DROP TABLE IF EXISTS _backup_${table}`)
    }
    // Snapshot current seed state
    for (const table of TABLES) {
      await client.query(
        `CREATE TABLE _backup_${table} AS SELECT * FROM ${table}`
      )
    }
  } finally {
    client.release()
  }

  return async function teardown() {
    const client = await pool.connect()
    try {
      // Truncate all backed-up tables. CASCADE handles any additional FK
      // dependencies (e.g. event_reminders, event_registration_limit_emails)
      // that are not seeded and therefore need no restoration.
      const tableList = TABLES.join(", ")
      await client.query(`TRUNCATE TABLE ${tableList} CASCADE`)

      // Restore in FK-dependency order (same as TABLES array)
      for (const table of TABLES) {
        await client.query(
          `INSERT INTO ${table} SELECT * FROM _backup_${table}`
        )
        await client.query(`DROP TABLE _backup_${table}`)
      }
    } finally {
      client.release()
      await pool.end()
    }
  }
}
