import type {
  ParseResult,
  ParseError,
  ProfileFlag,
  ApprovedToAttend,
} from "./parse-csv"

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

export function generateReport(_parseResult: ParseResult): AnalysisReport {
  return {
    summary: {
      totalRecords: 0,
      withEmail: 0,
      withoutEmail: 0,
      withPhone: 0,
      withoutPhone: 0,
    },
    flagDistribution: { none: 0, yellow: 0, red: 0, gray: 0 },
    approvalDistribution: {
      pending: 0,
      approved: 0,
      approved_with_reservations: 0,
      rejected: 0,
    },
    eventAttendance: [],
    dataQuality: {
      totalErrors: 0,
      errorsByField: {},
      errors: [],
    },
    generatedAt: "",
  }
}
