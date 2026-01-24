import {
  validateEmail,
  normalizePhone,
} from "./parse-csv"
import type {
  ParseResult,
  ParseError,
  ProfileFlag,
  ApprovedToAttend,
} from "./parse-csv"
import { EVENT_COLUMN_TO_ID } from "./event-mapping"

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
