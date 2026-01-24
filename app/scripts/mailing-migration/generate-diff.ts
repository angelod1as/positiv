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
  "email",
  "phone",
  "rg",
  "approved_to_attend",
  "flag",
  "general_notes",
] as const

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
    ? [...dbValue].sort().join(",")
    : String(dbValue)
  const sheetFormatted = Array.isArray(sheetValue)
    ? [...sheetValue].sort().join(",")
    : String(sheetValue)

  if (dbFormatted === sheetFormatted) return null
  return "revisão_manual"
}

export function diffProfile(
  profile: ProfileData,
  record: ParsedMailingRecord,
): DiffEntry[] {
  const entries: DiffEntry[] = []

  for (const field of COMPARABLE_FIELDS) {
    const dbValue = profile[field]
    const sheetValue = record[field as keyof ParsedMailingRecord]
    const action = compareField(dbValue, sheetValue)

    if (action !== null) {
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
  return value
}

export function formatDiffCsv(entries: DiffEntry[]): string {
  return ""
}

export function createKyselyProfileQueryFn(
  kysely: Kysely<Database>,
): ProfileQueryFn {
  return {
    findByIds: async () => [],
  }
}

async function main() {
  // stub
}

const isMainModule =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("generate-diff.ts")

if (isMainModule) {
  main().catch(console.error)
}
