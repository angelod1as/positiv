import * as fs from "fs"
import * as path from "path"
import { fileURLToPath } from "url"
import { Kysely, PostgresDialect } from "kysely"
import { Pool } from "pg"
import type { Database } from "~/types/database/kysely.types"
import type { ParsedMailingRecord } from "./parse-csv"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export type MatchType = "phone" | "email"

export interface MatchedRecord {
  rowIndex: number
  profileId: string
  matchType: MatchType
  email: string
  phone: number | null
}

export interface UnmatchedRecord {
  rowIndex: number
  email: string
  phone: number | null
}

export interface MatchResult {
  matched: MatchedRecord[]
  unmatched: UnmatchedRecord[]
}

export interface QueryFn {
  findByPhones: (phones: number[]) => Promise<{ id: string; phone: number }[]>
  findByEmails: (emails: string[]) => Promise<{ id: string; email: string }[]>
}

export async function matchProfiles(
  records: ParsedMailingRecord[],
  queryFn: QueryFn,
): Promise<MatchResult> {
  const matched: MatchedRecord[] = []
  const unmatchedAfterPhone: ParsedMailingRecord[] = []

  // Phase 1: Match by phone (primary)
  const phonesToQuery = [
    ...new Set(
      records.filter((r) => r.phone !== null).map((r) => r.phone as number),
    ),
  ]

  let phoneToProfileId = new Map<number, string>()
  if (phonesToQuery.length > 0) {
    const phoneProfiles = await queryFn.findByPhones(phonesToQuery)
    phoneToProfileId = new Map(phoneProfiles.map((p) => [p.phone, p.id]))
  }

  for (const record of records) {
    const phoneProfileId =
      record.phone !== null ? phoneToProfileId.get(record.phone) : undefined
    if (phoneProfileId) {
      matched.push({
        rowIndex: record._rowIndex,
        profileId: phoneProfileId,
        matchType: "phone",
        email: record.email,
        phone: record.phone,
      })
    } else {
      unmatchedAfterPhone.push(record)
    }
  }

  // Phase 2: Match remaining by email (fallback)
  if (unmatchedAfterPhone.length === 0) {
    return { matched, unmatched: [] }
  }

  const emailsToQuery = [...new Set(unmatchedAfterPhone.map((r) => r.email))]
  const emailProfiles = await queryFn.findByEmails(emailsToQuery)
  const emailToProfileId = new Map(emailProfiles.map((p) => [p.email, p.id]))

  const unmatched: UnmatchedRecord[] = []
  for (const record of unmatchedAfterPhone) {
    const emailProfileId = emailToProfileId.get(record.email)
    if (emailProfileId) {
      matched.push({
        rowIndex: record._rowIndex,
        profileId: emailProfileId,
        matchType: "email",
        email: record.email,
        phone: record.phone,
      })
    } else {
      unmatched.push({
        rowIndex: record._rowIndex,
        email: record.email,
        phone: record.phone,
      })
    }
  }

  return { matched, unmatched }
}

export function createKyselyQueryFn(kysely: Kysely<Database>): QueryFn {
  return {
    findByPhones: async (phones: number[]) => {
      const rows = await kysely
        .selectFrom("profiles")
        .select(["id", "phone"])
        .where("phone", "in", phones)
        .execute()
      // pg driver returns bigint as string; convert to number
      const seen = new Set<number>()
      return rows.reduce<{ id: string; phone: number }[]>((acc, r) => {
        const phone = Number(r.phone)
        if (seen.has(phone)) {
          console.warn(`Duplicate phone in DB: ${phone} (profile ${r.id})`)
        } else {
          seen.add(phone)
          acc.push({ id: r.id, phone })
        }
        return acc
      }, [])
    },
    findByEmails: async (emails: string[]) => {
      const rows = await kysely
        .selectFrom("profiles")
        .select(["id", "email"])
        .where("email", "in", emails)
        .execute()
      const seen = new Set<string>()
      return rows.reduce<{ id: string; email: string }[]>((acc, r) => {
        if (seen.has(r.email)) {
          console.warn(`Duplicate email in DB: ${r.email} (profile ${r.id})`)
        } else {
          seen.add(r.email)
          acc.push({ id: r.id, email: r.email })
        }
        return acc
      }, [])
    },
  }
}

async function main() {
  const dotenv = await import("dotenv")
  dotenv.config({ path: path.resolve(process.cwd(), ".env") })

  const inputPath = path.resolve(__dirname, "../../../mailing-parsed.json")
  const matchedOutputPath = path.resolve(__dirname, "../../../mailing-matched.json")
  const unmatchedOutputPath = path.resolve(__dirname, "../../../mailing-unmatched.json")

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}. Run parse-csv.ts first.`)
  }

  const connectionString = process.env.SUPABASE_CONNECT_URL
  if (!connectionString) {
    throw new Error("SUPABASE_CONNECT_URL environment variable is not set")
  }

  console.info("Matching mailing profiles...")
  console.info(`Input: ${inputPath}`)

  const parsed = JSON.parse(fs.readFileSync(inputPath, "utf-8"))
  const records: ParsedMailingRecord[] = parsed.records

  console.info(`Records to match: ${records.length}`)

  const kysely = new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new Pool({ connectionString }),
    }),
  })

  try {
    const queryFn = createKyselyQueryFn(kysely)
    const result = await matchProfiles(records, queryFn)

    console.info("\n=== Matching Complete ===")
    console.info(`Matched: ${result.matched.length}`)
    console.info(`  By phone: ${result.matched.filter((m) => m.matchType === "phone").length}`)
    console.info(`  By email: ${result.matched.filter((m) => m.matchType === "email").length}`)
    console.info(`Unmatched: ${result.unmatched.length}`)

    fs.writeFileSync(matchedOutputPath, JSON.stringify(result.matched, null, 2))
    console.info(`\nMatched output: ${matchedOutputPath}`)

    fs.writeFileSync(unmatchedOutputPath, JSON.stringify(result.unmatched, null, 2))
    console.info(`Unmatched output: ${unmatchedOutputPath}`)
  } finally {
    await kysely.destroy()
  }
}

const isMainModule =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("match-profiles.ts")

if (isMainModule) {
  main().catch(console.error)
}
