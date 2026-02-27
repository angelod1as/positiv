import { Pool } from "pg"
import type { PoolClient } from "pg"
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

// auth.users is intentionally excluded from the backup/restore cycle.
// Tests that create auth users (via createTestAuthUser) track them with TestDataTracker
// and delete them in each test's afterEach hook via cleanupTestAuthUsers. By the time
// global teardown runs, no test-created auth users remain. The seeded auth.users rows
// live in the auth schema and are never affected by TRUNCATE on public schema tables,
// so they are always present when user_roles is restored.

// Sequence reset is not needed: all primary keys in this codebase use UUIDs (via the
// uuid-ossp extension), so there are no integer sequences that could drift between runs.

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
  // dotenv.config() is called here because globalSetup runs in a separate Node process
  // from the test workers and cannot rely on the dotenv.config() in integration-setup.ts.
  dotenv.config({ path: path.resolve(process.cwd(), ".env") })

  const connectionString = process.env.SUPABASE_CONNECT_URL
  if (!connectionString) throw new Error("SUPABASE_CONNECT_URL is not set")

  // connectionTimeoutMillis ensures pool.connect() fails fast when the DB is unreachable
  // (e.g. local Supabase not running) instead of hanging indefinitely.
  const pool = new Pool({ connectionString, connectionTimeoutMillis: 5000 })

  try {
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
        // reorders columns between setup and teardown within the same test run.
        for (const table of TABLES) {
          const columns = await getColumnNames(client, table)
          const colList = columns.map(c => `"${c}"`).join(", ")
          await client.query(
            `INSERT INTO ${table} (${colList}) SELECT ${colList} FROM _backup_${table}`
          )
        }

        await client.query("COMMIT")
      } catch (err) {
        await client.query("ROLLBACK")
        throw err
      }

      // Drop backup tables only after the restore transaction commits successfully.
      // Keeping them until after COMMIT means a failed restore leaves backups intact.
      // IF EXISTS guards against a partially-completed prior teardown.
      for (const table of TABLES) {
        await client.query(`DROP TABLE IF EXISTS _backup_${table}`)
      }
    } finally {
      client.release()
      await pool.end()
    }
  }
}
