import { describe, expect, it } from "vitest"
import type {
  ParseResult,
  ParsedMailingRecord,
  ManualReviewRecord,
  ParseError,
  ProfileFlag,
  ApprovedToAttend,
} from "./parse-csv"
import { generateReport } from "./generate-report"

function createMockRecord(
  overrides: Partial<ParsedMailingRecord> = {},
): ParsedMailingRecord {
  return {
    _rowIndex: 2,
    full_name: "Test User",
    social_name: null,
    gender: null,
    orientation: null,
    pronouns: null,
    email: "test@example.com",
    phone: 11999999999,
    rg: null,
    flag: "none",
    approved_to_attend: "approved",
    general_notes: null,
    events: {},
    ...overrides,
  }
}

function createMockParseResult(
  overrides: Partial<ParseResult> = {},
): ParseResult {
  const records = overrides.records ?? [createMockRecord()]
  const requiresManualReview = overrides.requiresManualReview ?? []
  const errors = overrides.errors ?? []
  const total =
    overrides.stats?.total ?? records.length + requiresManualReview.length

  return {
    records,
    requiresManualReview,
    errors,
    stats: {
      total,
      valid: records.length,
      withErrors: 0,
      requiresManualReview: requiresManualReview.length,
      byFlag: overrides.stats?.byFlag ?? {
        none: records.length,
        yellow: 0,
        red: 0,
        gray: 0,
      },
      byApproval: overrides.stats?.byApproval ?? {
        pending: 0,
        approved: records.length,
        approved_with_reservations: 0,
        rejected: 0,
      },
      ...overrides.stats,
    },
  }
}

describe("generateReport", () => {
  describe("summary.totalRecords", () => {
    it("should count all records including manual review", () => {
      const parseResult = createMockParseResult({
        records: [createMockRecord(), createMockRecord({ _rowIndex: 3 })],
        requiresManualReview: [
          { rowIndex: 4, rawData: { "E-mail": "", Celular: "" }, errors: [] },
        ],
        stats: { total: 3, valid: 2, withErrors: 0, requiresManualReview: 1,
          byFlag: { none: 2, yellow: 0, red: 0, gray: 0 },
          byApproval: { pending: 0, approved: 2, approved_with_reservations: 0, rejected: 0 },
        },
      })

      const report = generateReport(parseResult)

      expect(report.summary.totalRecords).toBe(3)
    })
  })

  describe("summary.withEmail and withoutEmail", () => {
    it("should count all valid records as having email", () => {
      const parseResult = createMockParseResult({
        records: [createMockRecord(), createMockRecord({ _rowIndex: 3 })],
      })

      const report = generateReport(parseResult)

      expect(report.summary.withEmail).toBe(2)
      expect(report.summary.withoutEmail).toBe(0)
    })

    it("should count manual review entries with valid email", () => {
      const parseResult = createMockParseResult({
        records: [createMockRecord()],
        requiresManualReview: [
          {
            rowIndex: 3,
            rawData: { "E-mail": "valid@example.com", Celular: "" },
            errors: [],
          },
          {
            rowIndex: 4,
            rawData: { "E-mail": "invalid", Celular: "11999999999" },
            errors: [],
          },
        ],
        stats: { total: 3, valid: 1, withErrors: 0, requiresManualReview: 2,
          byFlag: { none: 1, yellow: 0, red: 0, gray: 0 },
          byApproval: { pending: 0, approved: 1, approved_with_reservations: 0, rejected: 0 },
        },
      })

      const report = generateReport(parseResult)

      expect(report.summary.withEmail).toBe(2)
      expect(report.summary.withoutEmail).toBe(1)
    })
  })

  describe("summary.withPhone and withoutPhone", () => {
    it("should count all valid records as having phone", () => {
      const parseResult = createMockParseResult({
        records: [createMockRecord(), createMockRecord({ _rowIndex: 3 })],
      })

      const report = generateReport(parseResult)

      expect(report.summary.withPhone).toBe(2)
      expect(report.summary.withoutPhone).toBe(0)
    })

    it("should count manual review entries with valid phone", () => {
      const parseResult = createMockParseResult({
        records: [createMockRecord()],
        requiresManualReview: [
          {
            rowIndex: 3,
            rawData: { "E-mail": "", Celular: "(11) 98888-7777" },
            errors: [],
          },
          {
            rowIndex: 4,
            rawData: { "E-mail": "test@example.com", Celular: "" },
            errors: [],
          },
        ],
        stats: { total: 3, valid: 1, withErrors: 0, requiresManualReview: 2,
          byFlag: { none: 1, yellow: 0, red: 0, gray: 0 },
          byApproval: { pending: 0, approved: 1, approved_with_reservations: 0, rejected: 0 },
        },
      })

      const report = generateReport(parseResult)

      expect(report.summary.withPhone).toBe(2)
      expect(report.summary.withoutPhone).toBe(1)
    })
  })

  describe("flagDistribution", () => {
    it("should match stats.byFlag directly", () => {
      const byFlag: Record<ProfileFlag, number> = {
        none: 5,
        yellow: 2,
        red: 1,
        gray: 0,
      }
      const parseResult = createMockParseResult({
        stats: {
          total: 8,
          valid: 8,
          withErrors: 0,
          requiresManualReview: 0,
          byFlag,
          byApproval: { pending: 0, approved: 8, approved_with_reservations: 0, rejected: 0 },
        },
      })

      const report = generateReport(parseResult)

      expect(report.flagDistribution).toEqual(byFlag)
    })
  })

  describe("approvalDistribution", () => {
    it("should match stats.byApproval directly", () => {
      const byApproval: Record<ApprovedToAttend, number> = {
        pending: 2,
        approved: 3,
        approved_with_reservations: 1,
        rejected: 2,
      }
      const parseResult = createMockParseResult({
        stats: {
          total: 8,
          valid: 8,
          withErrors: 0,
          requiresManualReview: 0,
          byFlag: { none: 8, yellow: 0, red: 0, gray: 0 },
          byApproval,
        },
      })

      const report = generateReport(parseResult)

      expect(report.approvalDistribution).toEqual(byApproval)
    })
  })

  describe("eventAttendance", () => {
    it("should count attended/notAttended/unknown per event column", () => {
      const records = [
        createMockRecord({
          _rowIndex: 2,
          events: { "04/02/23": true, "01/07/23": false },
        }),
        createMockRecord({
          _rowIndex: 3,
          events: { "04/02/23": true, "01/07/23": null },
        }),
        createMockRecord({
          _rowIndex: 4,
          events: { "04/02/23": false, "01/07/23": true },
        }),
      ]

      const parseResult = createMockParseResult({ records })

      const report = generateReport(parseResult)

      const event1 = report.eventAttendance.find(
        (e) => e.columnName === "04/02/23",
      )
      expect(event1).toEqual({
        columnName: "04/02/23",
        eventId: "d953e0d3-7a5e-4ff3-a161-0b855cf4c164",
        attended: 2,
        notAttended: 1,
        unknown: 0,
      })

      const event2 = report.eventAttendance.find(
        (e) => e.columnName === "01/07/23",
      )
      expect(event2).toEqual({
        columnName: "01/07/23",
        eventId: "6dfbb35c-6e2a-4bf7-a995-578e0e6dc82f",
        attended: 1,
        notAttended: 1,
        unknown: 1,
      })
    })

    it("should only include events that exist in EVENT_COLUMN_TO_ID", () => {
      const records = [
        createMockRecord({
          events: { "04/02/23": true, "unknown-event": true },
        }),
      ]

      const parseResult = createMockParseResult({ records })

      const report = generateReport(parseResult)

      const eventNames = report.eventAttendance.map((e) => e.columnName)
      expect(eventNames).toContain("04/02/23")
      expect(eventNames).not.toContain("unknown-event")
    })
  })

  describe("dataQuality", () => {
    it("should count total errors", () => {
      const errors: ParseError[] = [
        { rowIndex: 2, field: "email", message: "Invalid", value: "bad" },
        { rowIndex: 3, field: "phone", message: "Missing", value: "" },
        { rowIndex: 4, field: "email", message: "Invalid", value: "bad2" },
      ]

      const parseResult = createMockParseResult({ errors })

      const report = generateReport(parseResult)

      expect(report.dataQuality.totalErrors).toBe(3)
    })

    it("should group errors by field", () => {
      const errors: ParseError[] = [
        { rowIndex: 2, field: "email", message: "Invalid", value: "bad" },
        { rowIndex: 3, field: "phone", message: "Missing", value: "" },
        { rowIndex: 4, field: "email", message: "Invalid", value: "bad2" },
        { rowIndex: 5, field: "gender", message: "Invalid", value: "X" },
      ]

      const parseResult = createMockParseResult({ errors })

      const report = generateReport(parseResult)

      expect(report.dataQuality.errorsByField).toEqual({
        email: 2,
        phone: 1,
        gender: 1,
      })
    })

    it("should include original errors array", () => {
      const errors: ParseError[] = [
        { rowIndex: 2, field: "email", message: "Invalid", value: "bad" },
      ]

      const parseResult = createMockParseResult({ errors })

      const report = generateReport(parseResult)

      expect(report.dataQuality.errors).toEqual(errors)
    })
  })

  describe("generatedAt", () => {
    it("should include a valid ISO date string", () => {
      const parseResult = createMockParseResult()

      const report = generateReport(parseResult)

      expect(new Date(report.generatedAt).toISOString()).toBe(
        report.generatedAt,
      )
    })
  })
})
