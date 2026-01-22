import * as fs from "fs"
import * as path from "path"
import { fileURLToPath } from "url"
import XLSX from "xlsx"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
import {
  GENDERS,
  ORIENTATIONS,
  PRONOUNS,
} from "~/lib/constants/constants"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateEmail(email: string): string | null {
  const trimmed = email.trim()
  if (!trimmed) return null
  if (!EMAIL_REGEX.test(trimmed)) return null
  return trimmed.toLowerCase()
}

export function normalizePhone(phone: unknown): number | null {
  if (typeof phone === "number") return phone
  if (typeof phone !== "string") return null
  const digitsOnly = phone.replace(/\D/g, "")
  if (!digitsOnly) return null
  return parseInt(digitsOnly, 10)
}

export type ProfileFlag = "none" | "yellow" | "red" | "gray"
export type ApprovedToAttend =
  | "pending"
  | "approved"
  | "approved_with_reservations"
  | "rejected"

interface FlagApprovalResult {
  flag: ProfileFlag
  approved_to_attend: ApprovedToAttend
}

const YELLOW_FLAGS = ["🤔", "⚠️"]
const RED_FLAG = "🚨"
const APPROVAL_TRUE = ["TRUE", "Sim"]
const APPROVAL_FALSE = ["FALSE", "Não"]

export function mapFlagAndApproval(
  flagValue: string,
  approvedValue: string,
): FlagApprovalResult {
  const flag = flagValue.trim()
  const approved = approvedValue.trim()

  if (flag === RED_FLAG) {
    return { flag: "red", approved_to_attend: "rejected" }
  }

  if (YELLOW_FLAGS.includes(flag)) {
    return { flag: "yellow", approved_to_attend: "approved_with_reservations" }
  }

  if (APPROVAL_TRUE.includes(approved)) {
    return { flag: "none", approved_to_attend: "approved" }
  }

  if (APPROVAL_FALSE.includes(approved)) {
    return { flag: "none", approved_to_attend: "rejected" }
  }

  return { flag: "none", approved_to_attend: "pending" }
}

type ArrayFieldType = "gender" | "orientation" | "pronouns"

interface ArrayValidationError {
  error: true
  value: string
  validOptions: readonly string[]
}

const VALID_VALUES: Record<ArrayFieldType, readonly string[]> = {
  gender: GENDERS,
  orientation: ORIENTATIONS,
  pronouns: PRONOUNS,
}

function normalizeValue(value: string, fieldType: ArrayFieldType): string {
  const trimmed = value.trim()
  if (fieldType === "pronouns") {
    const parts = trimmed.split("/")
    if (parts.length === 2) {
      return `${parts[0].charAt(0).toUpperCase()}${parts[0].slice(1).toLowerCase()}/${parts[1].toLowerCase()}`
    }
  }
  return trimmed
}

export function mapToArray(
  value: string,
  fieldType: ArrayFieldType,
): string[] | null | ArrayValidationError {
  const trimmed = value.trim()
  if (!trimmed) return null

  const validOptions = VALID_VALUES[fieldType]
  const values = trimmed.split(",").map((v) => normalizeValue(v, fieldType))

  for (const v of values) {
    if (!validOptions.includes(v)) {
      return { error: true, value: trimmed, validOptions }
    }
  }

  return values
}

export function parseBoolean(value: unknown): boolean | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim().toUpperCase()
  if (!trimmed) return null
  if (trimmed === "TRUE") return true
  if (trimmed === "FALSE") return false
  return null
}

const LOWERCASE_PARTICLES = ["de", "da", "do", "dos", "das", "e"]

export function normalizeName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return ""
  return trimmed
    .split(" ")
    .map((word, index) => {
      const lower = word.toLowerCase()
      if (index > 0 && LOWERCASE_PARTICLES.includes(lower)) {
        return lower
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join(" ")
}

export interface ParsedMailingRecord {
  _rowIndex: number
  full_name: string
  social_name: string | null
  gender: string[] | null
  orientation: string[] | null
  pronouns: string[] | null
  email: string
  phone: number | null
  rg: string | null
  flag: ProfileFlag
  approved_to_attend: ApprovedToAttend
  general_notes: string | null
  events: Record<string, boolean | null>
}

export interface ParseError {
  rowIndex: number
  field: string
  message: string
  value: unknown
}

interface RowParseResult {
  record: ParsedMailingRecord | null
  errors: ParseError[]
}

function isArrayValidationError(
  result: string[] | null | ArrayValidationError,
): result is ArrayValidationError {
  return result !== null && typeof result === "object" && "error" in result
}

function getString(value: unknown): string {
  if (value === null || value === undefined) return ""
  return String(value)
}

function cleanSpreadsheetValue(value: unknown): string | null {
  const trimmed = getString(value).trim()
  if (!trimmed || trimmed === "#REF!") return null
  return trimmed
}

export function parseMailingRow(
  row: Record<string, unknown>,
  rowIndex: number,
  eventColumns: string[],
): RowParseResult {
  const errors: ParseError[] = []

  const email = validateEmail(getString(row["E-mail"]))
  if (!email) {
    errors.push({
      rowIndex,
      field: "email",
      message: "Invalid email format",
      value: row["E-mail"],
    })
  }

  const genderResult = mapToArray(getString(row["Gênero"]), "gender")
  if (isArrayValidationError(genderResult)) {
    errors.push({
      rowIndex,
      field: "gender",
      message: "Invalid value",
      value: genderResult.value,
    })
  }

  const orientationResult = mapToArray(
    getString(row["Orientação"]),
    "orientation",
  )
  if (isArrayValidationError(orientationResult)) {
    errors.push({
      rowIndex,
      field: "orientation",
      message: "Invalid value",
      value: orientationResult.value,
    })
  }

  const pronounsResult = mapToArray(getString(row["Pronomes"]), "pronouns")
  if (isArrayValidationError(pronounsResult)) {
    errors.push({
      rowIndex,
      field: "pronouns",
      message: "Invalid value",
      value: pronounsResult.value,
    })
  }

  const { flag, approved_to_attend } = mapFlagAndApproval(
    getString(row["Bandeira"]),
    getString(row["Aprovade para futuras festas?"]),
  )

  const events: Record<string, boolean | null> = {}
  for (const col of eventColumns) {
    events[col] = parseBoolean(row[col])
  }

  if (!email) {
    return { record: null, errors }
  }

  const record: ParsedMailingRecord = {
    _rowIndex: rowIndex,
    full_name: normalizeName(getString(row["Nome"])),
    social_name: cleanSpreadsheetValue(row["Nome social"]),
    gender: isArrayValidationError(genderResult) ? null : genderResult,
    orientation: isArrayValidationError(orientationResult)
      ? null
      : orientationResult,
    pronouns: isArrayValidationError(pronounsResult) ? null : pronounsResult,
    email,
    phone: normalizePhone(row["Celular"]),
    rg: cleanSpreadsheetValue(row["RG"]),
    flag,
    approved_to_attend,
    general_notes: cleanSpreadsheetValue(row["Observação"]),
    events,
  }

  return { record, errors }
}

export interface ManualReviewRecord {
  rowIndex: number
  rawData: Record<string, unknown>
  errors: ParseError[]
}

export interface ParseResult {
  records: ParsedMailingRecord[]
  requiresManualReview: ManualReviewRecord[]
  errors: ParseError[]
  stats: {
    total: number
    valid: number
    withErrors: number
    requiresManualReview: number
    byFlag: Record<ProfileFlag, number>
    byApproval: Record<ApprovedToAttend, number>
  }
}

const FIXED_COLUMNS = [
  "Nome",
  "Nome social",
  "Gênero",
  "Orientação",
  "Pronomes",
  "E-mail",
  "Celular",
  "RG",
  "Bandeira",
  "Aprovade para futuras festas?",
  "Convidade a gravar número Positiv",
]

const OBSERVATION_COLUMN = "Observação"

function getEventColumns(headers: string[]): string[] {
  const fixedSet = new Set([...FIXED_COLUMNS, OBSERVATION_COLUMN])
  return headers.filter((h) => !fixedSet.has(h))
}

export function parseMailingCsv(csvPath: string): ParseResult {
  if (!fs.existsSync(csvPath)) {
    throw new Error(`File not found: ${csvPath}`)
  }
  const fileBuffer = fs.readFileSync(csvPath)
  const workbook = XLSX.read(fileBuffer, { type: "buffer", codepage: 65001 })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
    defval: "",
  })

  const headers = Object.keys(rows[0] || {})
  const eventColumns = getEventColumns(headers)

  const records: ParsedMailingRecord[] = []
  const manualReview: ManualReviewRecord[] = []
  const allErrors: ParseError[] = []
  const byFlag: Record<ProfileFlag, number> = {
    none: 0,
    yellow: 0,
    red: 0,
    gray: 0,
  }
  const byApproval: Record<ApprovedToAttend, number> = {
    pending: 0,
    approved: 0,
    approved_with_reservations: 0,
    rejected: 0,
  }

  for (let i = 0; i < rows.length; i++) {
    const rowIndex = i + 2
    const { record, errors } = parseMailingRow(rows[i], rowIndex, eventColumns)
    if (record) {
      records.push(record)
      byFlag[record.flag]++
      byApproval[record.approved_to_attend]++
    } else {
      manualReview.push({ rowIndex, rawData: rows[i], errors })
    }
    allErrors.push(...errors)
  }

  const rowsWithErrors = new Set(allErrors.map((e) => e.rowIndex)).size

  return {
    records,
    requiresManualReview: manualReview,
    errors: allErrors,
    stats: {
      total: rows.length,
      valid: records.length - rowsWithErrors,
      withErrors: rowsWithErrors,
      requiresManualReview: manualReview.length,
      byFlag,
      byApproval,
    },
  }
}

async function main() {
  const csvPath = path.resolve(__dirname, "../../../mailing.csv")
  const outputPath = path.resolve(__dirname, "../../../mailing-parsed.json")
  const manualReviewPath = path.resolve(__dirname, "../../../mailing-manual-review.json")

  console.info("Parsing mailing CSV...")
  console.info(`Input: ${csvPath}`)

  const result = parseMailingCsv(csvPath)

  console.info("\n=== Parsing Complete ===")
  console.info(`Total records: ${result.stats.total}`)
  console.info(`Valid for DB insertion: ${result.records.length}`)
  console.info(`Requires manual review (missing email): ${result.stats.requiresManualReview}`)
  console.info(`Records with validation errors: ${result.stats.withErrors}`)
  console.info("\nBy Flag:")
  console.info(`  None: ${result.stats.byFlag.none}`)
  console.info(`  Yellow: ${result.stats.byFlag.yellow}`)
  console.info(`  Red: ${result.stats.byFlag.red}`)
  console.info(`  Gray: ${result.stats.byFlag.gray}`)
  console.info("\nBy Approval Status:")
  console.info(`  Pending: ${result.stats.byApproval.pending}`)
  console.info(`  Approved: ${result.stats.byApproval.approved}`)
  console.info(
    `  Approved with Reservations: ${result.stats.byApproval.approved_with_reservations}`,
  )
  console.info(`  Rejected: ${result.stats.byApproval.rejected}`)

  if (result.requiresManualReview.length > 0) {
    console.info("\n=== Requires Manual Review (missing/invalid email) ===")
    for (const entry of result.requiresManualReview) {
      const name = entry.rawData["Nome"] || "(no name)"
      console.info(`  Row ${entry.rowIndex}: ${name}`)
    }
  }

  if (result.errors.length > 0) {
    console.info("\n=== Validation Errors ===")
    for (const error of result.errors) {
      console.info(
        `Row ${error.rowIndex}: [${error.field}] ${error.message} - Value: "${error.value}"`,
      )
    }
  }

  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2))
  console.info(`\nOutput written to: ${outputPath}`)

  if (result.requiresManualReview.length > 0) {
    fs.writeFileSync(manualReviewPath, JSON.stringify(result.requiresManualReview, null, 2))
    console.info(`Manual review file: ${manualReviewPath}`)
  }
}

const isMainModule =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("parse-csv.ts")

if (isMainModule) {
  main().catch(console.error)
}
