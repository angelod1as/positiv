import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { setupIntegrationTest, cleanupAfterTest } from "~/test/integration-setup"
import { createTestProfile } from "~/test/db-test-utils"
import type { ParsedMailingRecord } from "./parse-csv"
import { createKyselyQueryFn, matchProfiles } from "./match-profiles"

function createMockRecord(
  overrides: Partial<ParsedMailingRecord> & { _rowIndex: number; email: string },
): ParsedMailingRecord {
  return {
    full_name: "Test User",
    social_name: null,
    gender: null,
    orientation: null,
    pronouns: null,
    phone: null,
    rg: null,
    flag: "none",
    approved_to_attend: "pending",
    general_notes: null,
    events: {},
    ...overrides,
  }
}

describe("matchProfiles integration", () => {
  const { tracker, kysely } = setupIntegrationTest()

  beforeEach(() => {
    tracker.clear()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  it("should match profiles by phone using real database", async () => {
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "db-user@test.com",
      phone: 11999990001,
      full_name: "DB User",
    })

    const records: ParsedMailingRecord[] = [
      createMockRecord({
        _rowIndex: 2,
        email: "spreadsheet@test.com",
        phone: 11999990001,
      }),
    ]

    const queryFn = createKyselyQueryFn(kysely)
    const result = await matchProfiles(records, queryFn)

    expect(result.matched).toHaveLength(1)
    expect(result.matched[0].profileId).toBe(profile.id)
    expect(result.matched[0].matchType).toBe("phone")
    expect(result.unmatched).toHaveLength(0)
  })

  it("should match profiles by email when phone does not match", async () => {
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "match-me@test.com",
      phone: 11999990002,
      full_name: "Email Match User",
    })

    const records: ParsedMailingRecord[] = [
      createMockRecord({
        _rowIndex: 2,
        email: "match-me@test.com",
        phone: 11000000000,
      }),
    ]

    const queryFn = createKyselyQueryFn(kysely)
    const result = await matchProfiles(records, queryFn)

    expect(result.matched).toHaveLength(1)
    expect(result.matched[0].profileId).toBe(profile.id)
    expect(result.matched[0].matchType).toBe("email")
  })

  it("should prioritize phone match over email match", async () => {
    const phoneProfile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "phone-owner@test.com",
      phone: 11999990003,
      full_name: "Phone Owner",
    })

    await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "spreadsheet-email@test.com",
      phone: 11999990004,
      full_name: "Email Owner",
    })

    const records: ParsedMailingRecord[] = [
      createMockRecord({
        _rowIndex: 2,
        email: "spreadsheet-email@test.com",
        phone: 11999990003,
      }),
    ]

    const queryFn = createKyselyQueryFn(kysely)
    const result = await matchProfiles(records, queryFn)

    expect(result.matched).toHaveLength(1)
    expect(result.matched[0].profileId).toBe(phoneProfile.id)
    expect(result.matched[0].matchType).toBe("phone")
  })

  it("should report unmatched records when no profile matches", async () => {
    const records: ParsedMailingRecord[] = [
      createMockRecord({
        _rowIndex: 2,
        email: "nobody@test.com",
        phone: 11000000099,
      }),
    ]

    const queryFn = createKyselyQueryFn(kysely)
    const result = await matchProfiles(records, queryFn)

    expect(result.matched).toHaveLength(0)
    expect(result.unmatched).toHaveLength(1)
    expect(result.unmatched[0].email).toBe("nobody@test.com")
  })

  it("should handle mixed matching with multiple profiles", async () => {
    const profile1 = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "user1@test.com",
      phone: 11999990005,
      full_name: "User 1",
    })

    const profile2 = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "user2@test.com",
      phone: 11999990006,
      full_name: "User 2",
    })

    const records: ParsedMailingRecord[] = [
      createMockRecord({ _rowIndex: 2, email: "a@x.com", phone: 11999990005 }),
      createMockRecord({ _rowIndex: 3, email: "user2@test.com", phone: 11000000001 }),
      createMockRecord({ _rowIndex: 4, email: "unknown@x.com", phone: 11000000002 }),
    ]

    const queryFn = createKyselyQueryFn(kysely)
    const result = await matchProfiles(records, queryFn)

    expect(result.matched).toHaveLength(2)

    const phoneMatch = result.matched.find((m) => m.matchType === "phone")
    expect(phoneMatch?.profileId).toBe(profile1.id)
    expect(phoneMatch?.rowIndex).toBe(2)

    const emailMatch = result.matched.find((m) => m.matchType === "email")
    expect(emailMatch?.profileId).toBe(profile2.id)
    expect(emailMatch?.rowIndex).toBe(3)

    expect(result.unmatched).toHaveLength(1)
    expect(result.unmatched[0].rowIndex).toBe(4)
  })
})
