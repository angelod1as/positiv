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

// auth.users is intentionally excluded from the backup/restore cycle: TRUNCATE on
// public schema tables never touches it, and restoring it would clobber auth users
// belonging to whoever else is on this database.
//
// The cost is that a row snapshotted here can lose its referent while the suite runs,
// so the restore puts back only the rows whose references still resolve.

export interface ForeignKey {
  column: string
  refTable: string
  refColumn: string
}

const BACKUP_TABLE_PATTERN = /^_backup_(\d+)_/

export function buildRestoreStatement(
  table: string,
  columns: string[],
  backupTable: string,
  foreignKeys: ForeignKey[]
): string {
  const colList = columns.map(c => `"${c}"`).join(", ")
  const guards = foreignKeys.map(
    fk =>
      `(b."${fk.column}" IS NULL OR EXISTS (SELECT 1 FROM ${fk.refTable} ref WHERE ref."${fk.refColumn}" = b."${fk.column}"))`
  )
  const where = guards.length > 0 ? ` WHERE ${guards.join(" AND ")}` : ""

  return `INSERT INTO ${table} (${colList}) SELECT ${colList} FROM ${backupTable} b${where}`
}

export function staleBackupTables(
  tables: string[],
  isPidAlive: (pid: number) => boolean
): string[] {
  return tables.filter(table => {
    const match = table.match(BACKUP_TABLE_PATTERN)
    if (!match) return false

    return !isPidAlive(Number(match[1]))
  })
}

function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

async function getColumnNames(client: PoolClient, table: string): Promise<string[]> {
  const result = await client.query<{ column_name: string }>(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1
     ORDER BY ordinal_position`,
    [table]
  )
  return result.rows.map(r => r.column_name)
}

async function getForeignKeys(client: PoolClient, table: string): Promise<ForeignKey[]> {
  // pg_catalog rather than information_schema: the latter hides the constraints that
  // point at the auth schema, which are exactly the ones that go stale here.
  const result = await client.query<{ column: string; ref_table: string; ref_column: string }>(
    `SELECT att.attname AS "column",
            fnsp.nspname || '.' || frel.relname AS ref_table,
            fatt.attname AS ref_column
     FROM pg_constraint con
     JOIN pg_class rel ON rel.oid = con.conrelid
     JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
     JOIN pg_class frel ON frel.oid = con.confrelid
     JOIN pg_namespace fnsp ON fnsp.oid = frel.relnamespace
     JOIN unnest(con.conkey) WITH ORDINALITY AS ck(attnum, ord) ON true
     JOIN unnest(con.confkey) WITH ORDINALITY AS fk(attnum, ord) ON fk.ord = ck.ord
     JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ck.attnum
     JOIN pg_attribute fatt ON fatt.attrelid = frel.oid AND fatt.attnum = fk.attnum
     WHERE con.contype = 'f' AND nsp.nspname = 'public' AND rel.relname = $1`,
    [table]
  )
  return result.rows.map(r => ({ column: r.column, refTable: r.ref_table, refColumn: r.ref_column }))
}

async function dropAbandonedBackups(client: PoolClient): Promise<void> {
  const result = await client.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name LIKE '\\_backup\\_%'`
  )

  for (const table of staleBackupTables(result.rows.map(r => r.table_name), isPidAlive)) {
    await client.query(`DROP TABLE IF EXISTS ${table}`)
  }
}

export default async function setup() {
  const connectionString = process.env.SUPABASE_CONNECT_URL
  if (!connectionString) throw new Error("SUPABASE_CONNECT_URL is not set")

  const pool = new Pool({ connectionString, connectionTimeoutMillis: 5000 })

  try {
    const client = await pool.connect()
    try {
      // A run that dies before teardown keeps its backups, by design, so they can be
      // inspected. Collect the ones whose run is long gone.
      await dropAbandonedBackups(client)

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
      // the DB is rolled back to its pre-TRUNCATE state and the backup tables remain
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
          const foreignKeys = await getForeignKeys(client, table)
          await client.query(
            buildRestoreStatement(table, columns, `_backup_${RUN_ID}_${table}`, foreignKeys)
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
