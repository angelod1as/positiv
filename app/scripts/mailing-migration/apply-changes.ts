import * as fs from "fs"
import * as path from "path"
import { fileURLToPath } from "url"
import { Kysely, PostgresDialect } from "kysely"
import { Pool } from "pg"
import * as readline from "readline"
import type { Database } from "~/types/database/kysely.types"
import type { DiffAction, DiffEntry } from "./generate-diff"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const ARRAY_FIELDS = ["gender", "orientation", "pronouns"]
const STRING_LITERAL_FIELDS = ["approved_to_attend", "flag"]

export interface ProfileUpdate {
  profileId: string
  fields: { fieldName: string; newValue: unknown }[]
}

export interface ExecuteFn {
  updateProfile: (id: string, data: Record<string, unknown>) => Promise<void>
}

export interface ChangeLogEntry {
  profileId: string
  fieldName: string
  newValue: unknown
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === ",") {
        fields.push(current)
        current = ""
      } else {
        current += char
      }
    }
  }
  fields.push(current)
  return fields
}

function splitCsvRows(content: string): string[] {
  const rows: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < content.length; i++) {
    const char = content[i]

    if (char === '"') {
      inQuotes = !inQuotes
      current += char
    } else if (char === "\n" && !inQuotes) {
      rows.push(current)
      current = ""
    } else if (char === "\r" && !inQuotes) {
      // skip \r, will get \n next
    } else {
      current += char
    }
  }
  if (current.length > 0) {
    rows.push(current)
  }
  return rows
}

export function parseReviewedCsv(csvContent: string): DiffEntry[] {
  let content = csvContent
  if (content.charCodeAt(0) === 0xfeff) {
    content = content.slice(1)
  }

  const rows = splitCsvRows(content)
  if (rows.length < 2) return []

  // Skip header row
  const entries: DiffEntry[] = []
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i].trim()
    if (row === "") continue

    const fields = parseCsvLine(rows[i])
    if (fields.length < 5) continue

    entries.push({
      profile_id: fields[0],
      field_name: fields[1],
      db_value: fields[2],
      spreadsheet_value: fields[3],
      action: fields[4] as DiffAction,
    })
  }

  return entries
}

export function filterApplicableChanges(entries: DiffEntry[]): {
  toApply: DiffEntry[]
  skipped: DiffEntry[]
  unresolved: DiffEntry[]
} {
  const toApply: DiffEntry[] = []
  const skipped: DiffEntry[] = []
  const unresolved: DiffEntry[] = []

  for (const entry of entries) {
    if (entry.action === "usar_planilha") {
      toApply.push(entry)
    } else if (entry.action === "manter_db") {
      skipped.push(entry)
    } else if (entry.action === "revisão_manual") {
      unresolved.push(entry)
    }
  }

  return { toApply, skipped, unresolved }
}

function convertFieldValue(
  fieldName: string,
  value: string,
): unknown {
  if (ARRAY_FIELDS.includes(fieldName)) {
    if (value === "") return []
    return value.split(",")
  }
  if (STRING_LITERAL_FIELDS.includes(fieldName)) {
    return value
  }
  // Regular string fields: empty string → null
  if (value === "") return null
  return value
}

export function groupChangesByProfile(
  entries: DiffEntry[],
): Map<string, ProfileUpdate> {
  const map = new Map<string, ProfileUpdate>()

  for (const entry of entries) {
    let update = map.get(entry.profile_id)
    if (!update) {
      update = { profileId: entry.profile_id, fields: [] }
      map.set(entry.profile_id, update)
    }
    update.fields.push({
      fieldName: entry.field_name,
      newValue: convertFieldValue(entry.field_name, entry.spreadsheet_value),
    })
  }

  return map
}

export async function applyChanges(
  updates: Map<string, ProfileUpdate>,
  executeFn: ExecuteFn,
): Promise<ChangeLogEntry[]> {
  const log: ChangeLogEntry[] = []

  for (const [, update] of updates) {
    const data: Record<string, unknown> = {}
    for (const field of update.fields) {
      data[field.fieldName] = field.newValue
      log.push({
        profileId: update.profileId,
        fieldName: field.fieldName,
        newValue: field.newValue,
      })
    }
    await executeFn.updateProfile(update.profileId, data)
  }

  return log
}

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer)
    })
  })
}

async function main() {
  const dotenv = await import("dotenv")
  dotenv.config({ path: path.resolve(process.cwd(), ".env") })

  const diffPath = path.resolve(__dirname, "../../../mailing-diff.csv")
  const logPath = path.resolve(__dirname, "../../../mailing-changes-log.json")

  if (!fs.existsSync(diffPath)) {
    throw new Error(
      `Input file not found: ${diffPath}. Run generate-diff.ts first and review the CSV.`,
    )
  }

  const connectionString = process.env.SUPABASE_CONNECT_URL
  if (!connectionString) {
    throw new Error("SUPABASE_CONNECT_URL environment variable is not set")
  }

  console.info("Applying reviewed diff changes...")
  console.info(`Input: ${diffPath}`)

  const csvContent = fs.readFileSync(diffPath, "utf-8")
  const entries = parseReviewedCsv(csvContent)

  console.info(`Total entries in CSV: ${entries.length}`)

  const { toApply, skipped, unresolved } = filterApplicableChanges(entries)

  console.info("\n=== Dry Run Summary ===")
  console.info(`  To apply (usar_planilha): ${toApply.length}`)
  console.info(`  Skipped (manter_db): ${skipped.length}`)
  console.info(`  Unresolved (revisão_manual): ${unresolved.length}`)

  if (unresolved.length > 0) {
    console.warn("\n⚠ WARNING: Unresolved entries found:")
    for (const entry of unresolved) {
      console.warn(
        `  - Profile ${entry.profile_id}: ${entry.field_name} (DB: "${entry.db_value}" vs Sheet: "${entry.spreadsheet_value}")`,
      )
    }
  }

  if (toApply.length === 0) {
    console.info("\nNo changes to apply. Exiting.")
    return
  }

  const updates = groupChangesByProfile(toApply)

  console.info(`\nProfiles to update: ${updates.size}`)
  console.info("Fields to change:")
  const fieldCounts = new Map<string, number>()
  for (const [, update] of updates) {
    for (const field of update.fields) {
      fieldCounts.set(field.fieldName, (fieldCounts.get(field.fieldName) || 0) + 1)
    }
  }
  for (const [fieldName, count] of fieldCounts) {
    console.info(`  ${fieldName}: ${count}`)
  }

  const answer = await prompt(
    "\nProceed with applying changes? (y/n): ",
  )
  if (answer.toLowerCase() !== "y") {
    console.info("Aborted.")
    return
  }

  const kysely = new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new Pool({ connectionString }),
    }),
  })

  try {
    const log = await kysely.transaction().execute(async (trx) => {
      const executeFn: ExecuteFn = {
        updateProfile: async (id, data) => {
          await trx
            .updateTable("profiles")
            .set(data)
            .where("id", "=", id)
            .execute()
        },
      }
      return applyChanges(updates, executeFn)
    })

    fs.writeFileSync(logPath, JSON.stringify(log, null, 2), "utf-8")
    console.info(`\n=== Changes Applied Successfully ===`)
    console.info(`Profiles updated: ${updates.size}`)
    console.info(`Total field changes: ${log.length}`)
    console.info(`Change log written to: ${logPath}`)
  } finally {
    await kysely.destroy()
  }
}

const isMainModule =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("apply-changes.ts")

if (isMainModule) {
  main().catch(console.error)
}
