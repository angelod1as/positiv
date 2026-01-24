import * as fs from "fs"
import * as path from "path"
import { fileURLToPath } from "url"
import { Kysely, PostgresDialect } from "kysely"
import { Pool } from "pg"
import * as readline from "readline"
import type { Database } from "~/types/database/kysely.types"
import type {
  ApprovedToAttend,
  ParsedMailingRecord,
  ProfileFlag,
} from "./parse-csv"
import type { UnmatchedRecord } from "./match-profiles"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export interface ProfileInsert {
  email: string
  full_name: string | null
  social_name: string | null
  gender: string[] | null
  orientation: string[] | null
  pronouns: string[] | null
  phone: number | null
  rg: string | null
  flag: ProfileFlag
  approved_to_attend: ApprovedToAttend
  general_notes: string | null
  basic_data_filled: boolean
}

export interface ExecuteFn {
  insertProfile: (data: ProfileInsert) => Promise<string>
}

export function buildProfileInserts(
  unmatched: UnmatchedRecord[],
  parsed: ParsedMailingRecord[],
): ProfileInsert[] {
  const recordMap = new Map(parsed.map((r) => [r._rowIndex, r]))
  const inserts: ProfileInsert[] = []

  for (const entry of unmatched) {
    const record = recordMap.get(entry.rowIndex)
    if (!record) continue

    inserts.push({
      email: record.email,
      full_name: record.full_name || null,
      social_name: record.social_name,
      gender: record.gender,
      orientation: record.orientation,
      pronouns: record.pronouns,
      phone: record.phone,
      rg: record.rg,
      flag: record.flag,
      approved_to_attend: record.approved_to_attend,
      general_notes: record.general_notes
        ? `[mailing] ${record.general_notes}`
        : null,
      basic_data_filled: false,
    })
  }

  return inserts
}

export async function createProfiles(
  inserts: ProfileInsert[],
  executeFn: ExecuteFn,
): Promise<string[]> {
  const ids: string[] = []

  for (const insert of inserts) {
    const id = await executeFn.insertProfile(insert)
    ids.push(id)
  }

  return ids
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

  const unmatchedPath = path.resolve(
    __dirname,
    "../../../mailing-unmatched.json",
  )
  const parsedPath = path.resolve(__dirname, "../../../mailing-parsed.json")
  const logPath = path.resolve(
    __dirname,
    "../../../mailing-created-profiles.json",
  )

  if (!fs.existsSync(unmatchedPath)) {
    throw new Error(
      `Input file not found: ${unmatchedPath}. Run match-profiles.ts first.`,
    )
  }
  if (!fs.existsSync(parsedPath)) {
    throw new Error(
      `Input file not found: ${parsedPath}. Run parse-csv.ts first.`,
    )
  }

  const connectionString = process.env.SUPABASE_CONNECT_URL
  if (!connectionString) {
    throw new Error("SUPABASE_CONNECT_URL environment variable is not set")
  }

  console.info("Creating profiles for unmatched records...")
  console.info(`Unmatched input: ${unmatchedPath}`)
  console.info(`Parsed input: ${parsedPath}`)

  const unmatched: UnmatchedRecord[] = JSON.parse(
    fs.readFileSync(unmatchedPath, "utf-8"),
  )
  const parsedData = JSON.parse(fs.readFileSync(parsedPath, "utf-8"))
  const parsed: ParsedMailingRecord[] = parsedData.records

  console.info(`Unmatched records: ${unmatched.length}`)

  const inserts = buildProfileInserts(unmatched, parsed)

  console.info("\n=== Dry Run Summary ===")
  console.info(`Profiles to create: ${inserts.length}`)

  if (inserts.length === 0) {
    console.info("No profiles to create. Exiting.")
    return
  }

  const fieldCounts = {
    withName: inserts.filter((i) => i.full_name).length,
    withPhone: inserts.filter((i) => i.phone).length,
    withNotes: inserts.filter((i) => i.general_notes).length,
    flagged: inserts.filter((i) => i.flag !== "none").length,
    rejected: inserts.filter((i) => i.approved_to_attend === "rejected").length,
  }
  console.info(`  With full_name: ${fieldCounts.withName}`)
  console.info(`  With phone: ${fieldCounts.withPhone}`)
  console.info(`  With general_notes: ${fieldCounts.withNotes}`)
  console.info(`  Flagged (non-none): ${fieldCounts.flagged}`)
  console.info(`  Rejected: ${fieldCounts.rejected}`)

  const answer = await prompt(
    "\nProceed with creating profiles? (y/n): ",
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
    const ids = await kysely.transaction().execute(async (trx) => {
      const executeFn: ExecuteFn = {
        insertProfile: async (data) => {
          const result = await trx
            .insertInto("profiles")
            .values({
              email: data.email,
              full_name: data.full_name,
              social_name: data.social_name,
              gender: data.gender,
              orientation: data.orientation,
              pronouns: data.pronouns,
              phone: data.phone,
              rg: data.rg,
              flag: data.flag,
              approved_to_attend: data.approved_to_attend,
              general_notes: data.general_notes,
              basic_data_filled: data.basic_data_filled,
            })
            .returning("id")
            .executeTakeFirstOrThrow()
          return result.id
        },
      }
      return createProfiles(inserts, executeFn)
    })

    const logData = inserts.map((insert, i) => ({
      id: ids[i],
      email: insert.email,
      full_name: insert.full_name,
    }))
    fs.writeFileSync(logPath, JSON.stringify(logData, null, 2), "utf-8")

    console.info(`\n=== Profiles Created Successfully ===`)
    console.info(`Profiles created: ${ids.length}`)
    console.info(`Log written to: ${logPath}`)
  } finally {
    await kysely.destroy()
  }
}

const isMainModule =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("create-profiles.ts")

if (isMainModule) {
  main().catch(console.error)
}
