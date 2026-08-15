import { Pool } from "pg"
import type { PoolClient } from "pg"

// PID-scoped suffix prevents backup table name collisions when two test processes run
// concurrently against the same database (e.g. CI matrix jobs).
const RUN_ID = process.pid

// Tables to snapshot before tests and restore afterwards, in FK-dependency order for INSERT.
// Ordered so that referenced tables come before referencing tables.
const TABLES = [
  "profiles",                   // seeded; wiped by kpi-scores (no WHERE)
  "user_roles",                 // seeded; references auth.users, not profiles
  "events",                     // seeded; referenced by event_participants
  "event_participants",         // seeded; wiped by kpi-scores and dataviz (no WHERE)
  "event_demographics_history", // wiped by demographics-history (no WHERE)
  "newsletter_subscriptions",   // seeded; not in TestDataTracker tableOrder — relies on this global restore
]

// auth.users is intentionally excluded from the backup/restore cycle.
// Tests that create auth users (via createTestAuthUser) track them with TestDataTracker
// and delete them in each test's afterEach hook via cleanupTestAuthUsers. By the time
// global teardown runs, no test-created auth users remain. The seeded auth.users rows
// live in the auth schema and are never affected by TRUNCATE on public schema tables,
// so they are always present when user_roles is restored.

async function getColumnNames(client: PoolClient, table: string): Promise<string[]> {
  const result = await client.query<{ column_name: string }>(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1
     ORDER BY ordinal_position`,
    [table]
  )
  return result.rows.map(r => r.column_name)
}

export default async function setup() {
  const connectionString = process.env.SUPABASE_CONNECT_URL
  if (!connectionString) throw new Error("SUPABASE_CONNECT_URL is not set")

  const pool = new Pool({ connectionString, connectionTimeoutMillis: 5000 })

  try {
    const client = await pool.connect()
    try {
      for (const table of TABLES) {
        await client.query(`DROP TABLE IF EXISTS _backup_${RUN_ID}_${table}`)
      }
      for (const table of TABLES) {
        await client.query(
          `CREATE TABLE _backup_${RUN_ID}_${table} AS SELECT * FROM ${table}`
        )
      }
    } finally {
      client.release()
    }
  } catch (err) {
    // Pool must be closed here: if setup fails, teardown will never be called.
    await pool.end()
    throw err
  }

  return async function teardown() {
    const client = await pool.connect()
    try {
      // Wrap the entire restore in a transaction so it is atomic. If any INSERT fails,
      // the DB is rolled back to the post-TRUNCATE state and the backup tables remain
      // intact for manual inspection or retry.
      await client.query("BEGIN")
      try {
        // TRUNCATE ... CASCADE is intentional: it also wipes tables that have FK
        // references to the seeded tables but are not themselves seeded (e.g.
        // event_reminders, event_registration_limit_emails). Those rows are created
        // by integration tests and do not need to be restored.
        const tableList = TABLES.join(", ")
        await client.query(`TRUNCATE TABLE ${tableList} CASCADE`)

        // Restore in FK-dependency order (same as TABLES array).
        // Column names are fetched explicitly from information_schema so the INSERT
        // matches by name rather than position — safe if a future migration adds or
        // reorders columns.
        for (const table of TABLES) {
          const columns = await getColumnNames(client, table)
          const colList = columns.map(c => `"${c}"`).join(", ")
          await client.query(
            `INSERT INTO ${table} (${colList}) SELECT ${colList} FROM _backup_${RUN_ID}_${table}`
          )
        }

        await client.query("COMMIT")
      } catch (err) {
        await client.query("ROLLBACK")
        throw err
      }

      for (const table of TABLES) {
        await client.query(`DROP TABLE IF EXISTS _backup_${RUN_ID}_${table}`)
      }
    } finally {
      client.release()
      await pool.end()
    }
  }
}
