import * as fs from "fs"
import * as path from "path"
import { fileURLToPath } from "url"
import { Kysely, PostgresDialect } from "kysely"
import { Pool } from "pg"
import type { Database } from "~/types/database/kysely.types"
import type { ParsedMailingRecord } from "./parse-csv"
import type { MatchedRecord } from "./match-profiles"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export type DiffAction = "manter_db" | "usar_planilha" | "revisão_manual"

export interface DiffEntry {
  profile_id: string
  field_name: string
  db_value: string
  spreadsheet_value: string
  action: DiffAction
}

export interface ProfileData {
  id: string
  full_name: string | null
  social_name: string | null
  gender: string[] | null
  orientation: string[] | null
  pronouns: string[] | null
  email: string
  phone: number | null
  rg: string | null
  approved_to_attend: string
  flag: string
  general_notes: string | null
}

export interface ProfileQueryFn {
  findByIds: (ids: string[]) => Promise<ProfileData[]>
}

export const COMPARABLE_FIELDS = [
  "full_name",
  "social_name",
  "gender",
  "orientation",
  "pronouns",
  "rg",
  "approved_to_attend",
  "flag",
  "general_notes",
] as const

const EMPTY_SOCIAL_NAMES = ["não tenho", "n/a"]

export const FLAG_DECISIONS: Record<string, DiffAction> = {
  "41424a70-7789-4796-b664-6991ab33d25f": "usar_planilha",
  "08cccd3e-b182-494f-8549-d492469fdccc": "usar_planilha",
  "cec1d6aa-3293-4043-9ae3-10ddd594091b": "usar_planilha",
  "1039a58b-cb6c-4618-ac44-69e754b2978c": "usar_planilha",
  "030995f6-80e6-41ef-b588-47613023f37d": "usar_planilha",
  "f2a5ff66-6d26-4997-9761-e6324c373b4b": "usar_planilha",
  "35cd7bf6-5499-4d46-8a06-dd133b5d4740": "manter_db",
  "4fa5f39f-f4a0-411e-b9df-23a58019b6bb": "manter_db",
  "2108f786-b769-446b-a917-fb1aaa85dd9f": "manter_db",
  "530e7132-4aeb-4f60-9b94-40c77cd4cbdc": "manter_db",
  "74d081e8-55d2-4562-a131-4b6334301250": "manter_db",
  "6fd04cb8-c8cf-4142-8853-00197661ee23": "manter_db",
  "f0435782-f1f1-4f09-93b0-aa6f5eade3be": "manter_db",
  "71205632-fc0e-4e20-8414-a65ad4835784": "manter_db",
  "0ca6ed9a-e36c-4ac5-89fb-df23eb3e976b": "manter_db",
  "9e461dc5-af56-4925-9914-29b507983fc6": "manter_db",
  "2c2ff7d6-5084-4cbe-b01d-bf6b95ef4292": "manter_db",
}

export function stripZeroWidth(value: string): string {
  return value.replace(/[\u200B-\u200F\u2028-\u202F\uFEFF\u200E\u200D]/g, "")
}

export function normalizeForComparison(value: string): string {
  return stripZeroWidth(value).trim().toLowerCase()
}

export function normalizeSocialName(value: unknown): unknown {
  if (typeof value !== "string") return value
  const normalized = normalizeForComparison(value)
  if (EMPTY_SOCIAL_NAMES.includes(normalized)) return null
  return value
}

export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === "string" && value === "") return true
  if (Array.isArray(value) && value.length === 0) return true
  return false
}

export function formatValue(value: unknown): string {
  if (value === null || value === undefined) return ""
  if (Array.isArray(value)) {
    if (value.length === 0) return ""
    return value.join(",")
  }
  return String(value)
}

export function compareField(
  dbValue: unknown,
  sheetValue: unknown,
): DiffAction | null {
  const dbEmpty = isEmpty(dbValue)
  const sheetEmpty = isEmpty(sheetValue)

  if (dbEmpty && sheetEmpty) return null
  if (!dbEmpty && sheetEmpty) return "manter_db"
  if (dbEmpty && !sheetEmpty) return "usar_planilha"

  const dbFormatted = Array.isArray(dbValue)
    ? [...dbValue].map((v) => normalizeForComparison(String(v))).sort().join(",")
    : normalizeForComparison(String(dbValue))
  const sheetFormatted = Array.isArray(sheetValue)
    ? [...sheetValue].map((v) => normalizeForComparison(String(v))).sort().join(",")
    : normalizeForComparison(String(sheetValue))

  if (dbFormatted === sheetFormatted) return null
  return "revisão_manual"
}

export function resolveApprovedToAttend(
  dbValue: string,
  sheetValue: string,
): DiffAction | null {
  const dbNorm = normalizeForComparison(dbValue)
  const sheetNorm = normalizeForComparison(sheetValue)
  if (dbNorm === sheetNorm) return null
  if (dbNorm === "pending" && sheetNorm === "rejected") return "usar_planilha"
  return "manter_db"
}

export function resolveGeneralNotes(
  dbValue: string | null,
  sheetValue: string | null,
): { action: DiffAction; finalValue: string } | null {
  if (isEmpty(sheetValue)) return null
  const prefixed = `[mailing] ${sheetValue}`
  if (isEmpty(dbValue)) {
    return { action: "usar_planilha", finalValue: prefixed }
  }
  return { action: "usar_planilha", finalValue: `${dbValue}. ${prefixed}` }
}

export function diffProfile(
  profile: ProfileData,
  record: ParsedMailingRecord,
): DiffEntry[] {
  const entries: DiffEntry[] = []

  for (const field of COMPARABLE_FIELDS) {
    const rawDbValue = profile[field]
    const rawSheetValue = record[field as keyof ParsedMailingRecord]

    if (field === "general_notes") {
      const result = resolveGeneralNotes(
        rawDbValue as string | null,
        rawSheetValue as string | null,
      )
      if (result) {
        entries.push({
          profile_id: profile.id,
          field_name: field,
          db_value: formatValue(rawDbValue),
          spreadsheet_value: result.finalValue,
          action: result.action,
        })
      }
      continue
    }

    if (field === "approved_to_attend") {
      const action = resolveApprovedToAttend(
        String(rawDbValue ?? ""),
        String(rawSheetValue ?? ""),
      )
      if (action) {
        entries.push({
          profile_id: profile.id,
          field_name: field,
          db_value: formatValue(rawDbValue),
          spreadsheet_value: formatValue(rawSheetValue),
          action,
        })
      }
      continue
    }

    if (field === "flag") {
      const action = compareField(rawDbValue, rawSheetValue)
      if (action === "revisão_manual") {
        const decision = FLAG_DECISIONS[profile.id]
        if (decision) {
          entries.push({
            profile_id: profile.id,
            field_name: field,
            db_value: formatValue(rawDbValue),
            spreadsheet_value: formatValue(rawSheetValue),
            action: decision,
          })
        }
      }
      continue
    }

    const dbValue =
      field === "social_name" ? normalizeSocialName(rawDbValue) : rawDbValue
    const sheetValue =
      field === "social_name"
        ? normalizeSocialName(rawSheetValue)
        : rawSheetValue

    const action = compareField(dbValue, sheetValue)
    if (action === null) continue

    if (action === "usar_planilha") {
      entries.push({
        profile_id: profile.id,
        field_name: field,
        db_value: formatValue(dbValue),
        spreadsheet_value: formatValue(sheetValue),
        action: "usar_planilha",
      })
    } else if (action === "revisão_manual") {
      entries.push({
        profile_id: profile.id,
        field_name: field,
        db_value: formatValue(dbValue),
        spreadsheet_value: formatValue(sheetValue),
        action: "manter_db",
      })
    } else {
      entries.push({
        profile_id: profile.id,
        field_name: field,
        db_value: formatValue(dbValue),
        spreadsheet_value: formatValue(sheetValue),
        action,
      })
    }
  }

  return entries
}

export async function generateDiff(
  matched: MatchedRecord[],
  parsed: ParsedMailingRecord[],
  queryFn: ProfileQueryFn,
): Promise<DiffEntry[]> {
  if (matched.length === 0) return []

  const profileIds = [...new Set(matched.map((m) => m.profileId))]
  const profiles = await queryFn.findByIds(profileIds)
  const profileMap = new Map(profiles.map((p) => [p.id, p]))

  const recordMap = new Map(parsed.map((r) => [r._rowIndex, r]))

  const entries: DiffEntry[] = []
  for (const match of matched) {
    const profile = profileMap.get(match.profileId)
    const record = recordMap.get(match.rowIndex)
    if (!profile || !record) continue
    entries.push(...diffProfile(profile, record))
  }

  return entries
}

export function escapeCsvField(value: string): string {
  if (!value) return value
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function formatDiffCsv(entries: DiffEntry[]): string {
  const header = "profile_id,nome_do_campo,valor_atual_db,valor_planilha,ação"
  const rows = entries.map(
    (e) =>
      [
        escapeCsvField(e.profile_id),
        escapeCsvField(e.field_name),
        escapeCsvField(e.db_value),
        escapeCsvField(e.spreadsheet_value),
        escapeCsvField(e.action),
      ].join(","),
  )
  return `\uFEFF${[header, ...rows].join("\n")}\n`
}

export function createKyselyProfileQueryFn(
  kysely: Kysely<Database>,
): ProfileQueryFn {
  return {
    findByIds: async (ids: string[]) => {
      if (ids.length === 0) return []
      const rows = await kysely
        .selectFrom("profiles")
        .select([
          "id",
          "full_name",
          "social_name",
          "gender",
          "orientation",
          "pronouns",
          "email",
          "phone",
          "rg",
          "approved_to_attend",
          "flag",
          "general_notes",
        ])
        .where("id", "in", ids)
        .execute()
      return rows.map((r) => ({
        ...r,
        phone: r.phone !== null ? Number(r.phone) : null,
      })) as ProfileData[]
    },
  }
}

async function main() {
  const dotenv = await import("dotenv")
  dotenv.config({ path: path.resolve(process.cwd(), ".env") })

  const matchedPath = path.resolve(__dirname, "../../../mailing-matched.json")
  const parsedPath = path.resolve(__dirname, "../../../mailing-parsed.json")
  const outputPath = path.resolve(__dirname, "../../../mailing-diff.csv")

  if (!fs.existsSync(matchedPath)) {
    throw new Error(
      `Input file not found: ${matchedPath}. Run match-profiles.ts first.`,
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

  console.info("Generating diff CSV...")
  console.info(`Matched input: ${matchedPath}`)
  console.info(`Parsed input: ${parsedPath}`)

  const matched: MatchedRecord[] = JSON.parse(
    fs.readFileSync(matchedPath, "utf-8"),
  )
  const parsedData = JSON.parse(fs.readFileSync(parsedPath, "utf-8"))
  const parsed: ParsedMailingRecord[] = parsedData.records

  console.info(`Matched records: ${matched.length}`)
  console.info(`Parsed records: ${parsed.length}`)

  const kysely = new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new Pool({ connectionString }),
    }),
  })

  try {
    const queryFn = createKyselyProfileQueryFn(kysely)
    const entries = await generateDiff(matched, parsed, queryFn)

    console.info("\n=== Diff Generation Complete ===")
    console.info(`Total diff entries: ${entries.length}`)

    const byAction = entries.reduce(
      (acc, e) => {
        acc[e.action] = (acc[e.action] || 0) + 1
        return acc
      },
      {} as Record<DiffAction, number>,
    )
    console.info("\nBy Action:")
    console.info(`  manter_db: ${byAction["manter_db"] || 0}`)
    console.info(`  usar_planilha: ${byAction["usar_planilha"] || 0}`)
    console.info(`  revisão_manual: ${byAction["revisão_manual"] || 0}`)

    const uniqueProfiles = new Set(entries.map((e) => e.profile_id)).size
    console.info(`\nProfiles with differences: ${uniqueProfiles}`)

    const csv = formatDiffCsv(entries)
    fs.writeFileSync(outputPath, csv, "utf-8")
    console.info(`\nOutput written to: ${outputPath}`)
  } finally {
    await kysely.destroy()
  }
}

const isMainModule =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("generate-diff.ts")

if (isMainModule) {
  main().catch(console.error)
}
