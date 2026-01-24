import * as fs from "fs"
import * as path from "path"
import { fileURLToPath } from "url"
import {
  validateEmail,
  normalizePhone,
  parseMailingCsv,
} from "./parse-csv"
import type {
  ParseResult,
  ParseError,
  ProfileFlag,
  ApprovedToAttend,
} from "./parse-csv"
import { EVENT_COLUMN_TO_ID } from "./event-mapping"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export interface EventAttendanceEntry {
  columnName: string
  eventId: string
  attended: number
  notAttended: number
  unknown: number
}

export interface DataQualitySummary {
  totalErrors: number
  errorsByField: Record<string, number>
  errors: ParseError[]
}

export interface AnalysisReport {
  summary: {
    totalRecords: number
    withEmail: number
    withoutEmail: number
    withPhone: number
    withoutPhone: number
  }
  flagDistribution: Record<ProfileFlag, number>
  approvalDistribution: Record<ApprovedToAttend, number>
  eventAttendance: EventAttendanceEntry[]
  dataQuality: DataQualitySummary
  generatedAt: string
}

export function generateReport(parseResult: ParseResult): AnalysisReport {
  const { records, requiresManualReview, errors, stats } = parseResult
  const totalRecords = stats.total

  const manualReviewWithEmail = requiresManualReview.filter(
    (entry) => validateEmail(String(entry.rawData["E-mail"] ?? "")) !== null,
  ).length
  const withEmail = records.length + manualReviewWithEmail
  const withoutEmail = totalRecords - withEmail

  const manualReviewWithPhone = requiresManualReview.filter(
    (entry) => normalizePhone(entry.rawData["Celular"]) !== null,
  ).length
  const withPhone = records.length + manualReviewWithPhone
  const withoutPhone = totalRecords - withPhone

  const eventColumns = Object.keys(EVENT_COLUMN_TO_ID)
  const eventAttendance: EventAttendanceEntry[] = []

  for (const columnName of eventColumns) {
    let attended = 0
    let notAttended = 0
    let unknown = 0

    for (const record of records) {
      const value = record.events[columnName]
      if (value === true) attended++
      else if (value === false) notAttended++
      else unknown++
    }

    if (attended > 0 || notAttended > 0 || unknown > 0) {
      eventAttendance.push({
        columnName,
        eventId: EVENT_COLUMN_TO_ID[columnName],
        attended,
        notAttended,
        unknown,
      })
    }
  }

  const errorsByField: Record<string, number> = {}
  for (const error of errors) {
    errorsByField[error.field] = (errorsByField[error.field] ?? 0) + 1
  }

  return {
    summary: {
      totalRecords,
      withEmail,
      withoutEmail,
      withPhone,
      withoutPhone,
    },
    flagDistribution: stats.byFlag,
    approvalDistribution: stats.byApproval,
    eventAttendance,
    dataQuality: {
      totalErrors: errors.length,
      errorsByField,
      errors,
    },
    generatedAt: new Date().toISOString(),
  }
}

export function formatReport(report: AnalysisReport): string {
  const lines: string[] = []

  lines.push("=== Mailing Analysis Report ===")
  lines.push(`Generated at: ${report.generatedAt}`)
  lines.push("")

  lines.push("--- Summary ---")
  lines.push(`  Total records: ${report.summary.totalRecords}`)
  lines.push(`  With email: ${report.summary.withEmail}`)
  lines.push(`  Without email: ${report.summary.withoutEmail}`)
  lines.push(`  With phone: ${report.summary.withPhone}`)
  lines.push(`  Without phone: ${report.summary.withoutPhone}`)
  lines.push("")

  lines.push("--- Flag Distribution ---")
  for (const [flag, count] of Object.entries(report.flagDistribution)) {
    lines.push(`  ${flag}: ${count}`)
  }
  lines.push("")

  lines.push("--- Approval Distribution ---")
  for (const [status, count] of Object.entries(report.approvalDistribution)) {
    lines.push(`  ${status}: ${count}`)
  }
  lines.push("")

  lines.push("--- Event Attendance ---")
  for (const entry of report.eventAttendance) {
    lines.push(`  ${entry.columnName} (${entry.eventId})`)
    lines.push(`    Attended: ${entry.attended}`)
    lines.push(`    Not attended: ${entry.notAttended}`)
    lines.push(`    Unknown: ${entry.unknown}`)
  }
  lines.push("")

  lines.push("--- Data Quality ---")
  lines.push(`  Total errors: ${report.dataQuality.totalErrors}`)
  if (Object.keys(report.dataQuality.errorsByField).length > 0) {
    lines.push("  Errors by field:")
    for (const [field, count] of Object.entries(report.dataQuality.errorsByField)) {
      lines.push(`    ${field}: ${count}`)
    }
  }

  return lines.join("\n")
}

async function main() {
  const csvPath = path.resolve(__dirname, "../../../mailing.csv")
  const outputPath = path.resolve(__dirname, "../../../mailing-report.json")

  console.info("Generating mailing analysis report...")
  console.info(`Input: ${csvPath}`)

  const parseResult = parseMailingCsv(csvPath)
  const report = generateReport(parseResult)

  console.info("")
  console.info(formatReport(report))

  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2))
  console.info(`\nReport saved to: ${outputPath}`)
}

const isMainModule =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("generate-report.ts")

if (isMainModule) {
  main().catch(console.error)
}
