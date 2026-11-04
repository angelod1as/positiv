import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it, beforeEach, afterEach } from "vitest"
import { sql, type Kysely } from "kysely"
import type { Database } from "~/types/database/kysely.types"
import {
  setupIntegrationTest,
  cleanupAfterTest,
} from "~/test/integration-setup"
import {
  createTestEvent,
  createTestEventParticipant,
  createTestProfile,
  type TestDataTracker,
} from "~/test/db-test-utils"

const SCRIPT_PATH = resolve(
  __dirname,
  "../../scripts/annual-report/annual-report.sql",
)
const YEAR_DECLARATION = /\b2026 AS report_year\b/g
const REPORT_YEAR = 1951

type ReportRow = {
  year: number
  metric: string
  category: string | null
  value: string
}

function scriptForYear(year: number): string {
  const script = readFileSync(SCRIPT_PATH, "utf8")
  const declarations = script.match(YEAR_DECLARATION) ?? []
  expect(declarations).toHaveLength(1)
  return script.replace(YEAR_DECLARATION, `${year} AS report_year`)
}

async function runReport(
  kysely: Kysely<Database>,
  year: number,
): Promise<ReportRow[]> {
  const script = scriptForYear(year)
  return kysely
    .transaction()
    .setAccessMode("read only")
    .execute(async (trx) => {
      const result = await sql.raw<ReportRow>(script).execute(trx)
      return result.rows
    })
}

function valueOf(
  rows: ReportRow[],
  year: number,
  metric: string,
  category: string | null = null,
): number | undefined {
  const row = rows.find(
    (r) => r.year === year && r.metric === metric && r.category === category,
  )
  return row === undefined ? undefined : Number(row.value)
}

function partyIn(
  tracker: TestDataTracker,
  kysely: Kysely<Database>,
  year: number,
  overrides: Record<string, unknown> = {},
) {
  return createTestEvent(tracker, kysely, {
    title: `Annual report party ${year}`,
    event_status: "Completed",
    time_event_start: `${year}-06-15T22:00:00-03:00`,
    ...overrides,
  })
}

let profileCounter = 0

function person(
  tracker: TestDataTracker,
  kysely: Kysely<Database>,
  data: Record<string, unknown> = {},
) {
  profileCounter++
  return createTestProfile(tracker, kysely, {
    user_id: null,
    email: `annual-report-${Date.now()}-${profileCounter}@example.com`,
    ...data,
  })
}

function attend(
  tracker: TestDataTracker,
  kysely: Kysely<Database>,
  profileId: string,
  eventId: string,
  data: Record<string, unknown> = {},
) {
  return createTestEventParticipant(tracker, kysely, {
    profile_id: profileId,
    event_id: eventId,
    application_status: "finalised",
    attendance_status: "attended",
    ...data,
  })
}

describe("Annual report SQL script", () => {
  const { tracker, kysely } = setupIntegrationTest()

  beforeEach(() => {
    tracker.clear()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  it("counts the year's parties, leaving drafts and cancelled ones out", async () => {
    await partyIn(tracker, kysely, REPORT_YEAR)
    await partyIn(tracker, kysely, REPORT_YEAR, { event_status: "Scheduled" })
    await partyIn(tracker, kysely, REPORT_YEAR, { event_status: "Draft" })
    await partyIn(tracker, kysely, REPORT_YEAR, { event_status: "Cancelled" })
    await partyIn(tracker, kysely, REPORT_YEAR + 1)

    const rows = await runReport(kysely, REPORT_YEAR)

    expect(valueOf(rows, REPORT_YEAR, "parties")).toBe(2)
  })

  it("reports the three years before the report year, and no earlier", async () => {
    for (let year = REPORT_YEAR - 4; year <= REPORT_YEAR; year++) {
      await partyIn(tracker, kysely, year)
    }

    const rows = await runReport(kysely, REPORT_YEAR)

    expect(valueOf(rows, REPORT_YEAR, "parties")).toBe(1)
    expect(valueOf(rows, REPORT_YEAR - 1, "parties")).toBe(1)
    expect(valueOf(rows, REPORT_YEAR - 2, "parties")).toBe(1)
    expect(valueOf(rows, REPORT_YEAR - 3, "parties")).toBe(1)
    expect(rows.filter((r) => r.year === REPORT_YEAR - 4)).toEqual([])
  })

  it("reads 0, not a missing row, for a year with nothing in it", async () => {
    const rows = await runReport(kysely, REPORT_YEAR)

    for (const metric of ["parties", "people", "social_spots", "novates"]) {
      expect(valueOf(rows, REPORT_YEAR - 2, metric)).toBe(0)
    }
  })

  it("places a party in its year by São Paulo time, not UTC", async () => {
    await partyIn(tracker, kysely, REPORT_YEAR, {
      time_event_start: `${REPORT_YEAR}-12-31T22:00:00-03:00`,
    })
    await partyIn(tracker, kysely, REPORT_YEAR, {
      time_event_start: `${REPORT_YEAR - 1}-12-31T22:00:00-03:00`,
    })

    const rows = await runReport(kysely, REPORT_YEAR)

    expect(valueOf(rows, REPORT_YEAR, "parties")).toBe(1)
    expect(valueOf(rows, REPORT_YEAR - 1, "parties")).toBe(1)
  })

  it("counts each person who attended once, whatever their spot", async () => {
    const first = await partyIn(tracker, kysely, REPORT_YEAR)
    const second = await partyIn(tracker, kysely, REPORT_YEAR)
    const regular = await person(tracker, kysely)
    const staff = await person(tracker, kysely)
    const noShow = await person(tracker, kysely)

    await attend(tracker, kysely, regular.id, first.id)
    await attend(tracker, kysely, regular.id, second.id)
    await attend(tracker, kysely, staff.id, first.id, { spot_type: "staff" })
    await attend(tracker, kysely, noShow.id, first.id, {
      attendance_status: "not-attended",
    })

    const rows = await runReport(kysely, REPORT_YEAR)

    expect(valueOf(rows, REPORT_YEAR, "people")).toBe(2)
  })

  it("counts the social spots people used", async () => {
    const first = await partyIn(tracker, kysely, REPORT_YEAR)
    const second = await partyIn(tracker, kysely, REPORT_YEAR)
    const social = await person(tracker, kysely)
    const socialNoShow = await person(tracker, kysely)
    const regular = await person(tracker, kysely)

    await attend(tracker, kysely, social.id, first.id, { spot_type: "social" })
    await attend(tracker, kysely, social.id, second.id, { spot_type: "social" })
    await attend(tracker, kysely, social.id, second.id, { spot_type: "social" })
    await attend(tracker, kysely, socialNoShow.id, first.id, {
      spot_type: "social",
      attendance_status: "withdrew",
    })
    await attend(tracker, kysely, regular.id, first.id)

    const rows = await runReport(kysely, REPORT_YEAR)

    expect(valueOf(rows, REPORT_YEAR, "social_spots")).toBe(2)
  })

  it("counts as novates only the people whose first party was that year", async () => {
    const lastYear = await partyIn(tracker, kysely, REPORT_YEAR - 1)
    const lastYearNoShow = await partyIn(tracker, kysely, REPORT_YEAR - 1)
    const thisYear = await partyIn(tracker, kysely, REPORT_YEAR)
    const returning = await person(tracker, kysely)
    const novate = await person(tracker, kysely)
    const novateWhoSkippedBefore = await person(tracker, kysely)

    await attend(tracker, kysely, returning.id, lastYear.id)
    await attend(tracker, kysely, returning.id, thisYear.id)
    await attend(tracker, kysely, novate.id, thisYear.id)
    await attend(
      tracker,
      kysely,
      novateWhoSkippedBefore.id,
      lastYearNoShow.id,
      {
        attendance_status: "not-attended",
      },
    )
    await attend(tracker, kysely, novateWhoSkippedBefore.id, thisYear.id)

    const rows = await runReport(kysely, REPORT_YEAR)

    expect(valueOf(rows, REPORT_YEAR, "novates")).toBe(2)
    expect(valueOf(rows, REPORT_YEAR - 1, "novates")).toBe(1)
  })

  it("takes each person's age at their first party of the year", async () => {
    const june = await partyIn(tracker, kysely, REPORT_YEAR)
    const december = await partyIn(tracker, kysely, REPORT_YEAR, {
      time_event_start: `${REPORT_YEAR}-12-20T22:00:00-03:00`,
    })
    const twenty = await person(tracker, kysely, {
      date_of_birth: `${REPORT_YEAR - 20}-01-01`,
    })
    const turnsThirtyNextDay = await person(tracker, kysely, {
      date_of_birth: `${REPORT_YEAR - 30}-06-16`,
    })
    const fiftyOne = await person(tracker, kysely, {
      date_of_birth: `${REPORT_YEAR - 51}-01-01`,
    })
    const tooYoung = await person(tracker, kysely, {
      date_of_birth: `${REPORT_YEAR - 17}-01-01`,
    })
    const noBirthDate = await person(tracker, kysely, { date_of_birth: null })

    await attend(tracker, kysely, twenty.id, june.id)
    await attend(tracker, kysely, turnsThirtyNextDay.id, june.id)
    await attend(tracker, kysely, turnsThirtyNextDay.id, december.id)
    await attend(tracker, kysely, fiftyOne.id, june.id)
    await attend(tracker, kysely, tooYoung.id, june.id)
    await attend(tracker, kysely, noBirthDate.id, june.id)

    const rows = await runReport(kysely, REPORT_YEAR)

    expect(valueOf(rows, REPORT_YEAR, "age", "min")).toBe(20)
    expect(valueOf(rows, REPORT_YEAR, "age", "avg")).toBe(33.3)
    expect(valueOf(rows, REPORT_YEAR, "age", "max")).toBe(51)
    expect(valueOf(rows, REPORT_YEAR, "age_range", "18-24")).toBe(1)
    expect(valueOf(rows, REPORT_YEAR, "age_range", "25-29")).toBe(1)
    expect(valueOf(rows, REPORT_YEAR, "age_range", "30-34")).toBe(0)
    expect(valueOf(rows, REPORT_YEAR, "age_range", "50+")).toBe(1)
  })

  it("counts every value of a multi-select answer once per person", async () => {
    const first = await partyIn(tracker, kysely, REPORT_YEAR)
    const second = await partyIn(tracker, kysely, REPORT_YEAR)
    const several = await person(tracker, kysely, {
      gender: ["Mulher trans", "Pessoa não binária"],
      orientation: ["Bi", "Pan", "Bi"],
      race_color: ["Preta"],
    })
    const one = await person(tracker, kysely, {
      gender: ["Mulher trans"],
      orientation: ["Lésbica"],
      race_color: [" Parda ", "Indígena"],
    })
    const unanswered = await person(tracker, kysely, {
      gender: [],
      orientation: null,
      race_color: [],
    })

    await attend(tracker, kysely, several.id, first.id)
    await attend(tracker, kysely, several.id, second.id)
    await attend(tracker, kysely, one.id, first.id)
    await attend(tracker, kysely, unanswered.id, first.id)

    const rows = await runReport(kysely, REPORT_YEAR)

    expect(valueOf(rows, REPORT_YEAR, "gender", "Mulher trans")).toBe(2)
    expect(valueOf(rows, REPORT_YEAR, "gender", "Pessoa não binária")).toBe(1)
    expect(valueOf(rows, REPORT_YEAR, "gender", "Não informado")).toBe(1)
    expect(valueOf(rows, REPORT_YEAR, "orientation", "Bi")).toBe(1)
    expect(valueOf(rows, REPORT_YEAR, "orientation", "Pan")).toBe(1)
    expect(valueOf(rows, REPORT_YEAR, "orientation", "Lésbica")).toBe(1)
    expect(valueOf(rows, REPORT_YEAR, "orientation", "Não informado")).toBe(1)
    expect(valueOf(rows, REPORT_YEAR, "race_color", "Preta")).toBe(1)
    expect(valueOf(rows, REPORT_YEAR, "race_color", "Parda")).toBe(1)
    expect(valueOf(rows, REPORT_YEAR, "race_color", "Indígena")).toBe(1)
    expect(valueOf(rows, REPORT_YEAR, "race_color", "Não informado")).toBe(1)
  })
})
