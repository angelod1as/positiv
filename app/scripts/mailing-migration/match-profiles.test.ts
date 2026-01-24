import { describe, expect, it, vi } from "vitest"
import type { ParsedMailingRecord } from "./parse-csv"
import { matchProfiles, type QueryFn } from "./match-profiles"

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

describe("matchProfiles", () => {
  describe("phone matching (primary)", () => {
    it("should match records by phone number", async () => {
      const records: ParsedMailingRecord[] = [
        createMockRecord({ _rowIndex: 2, email: "a@x.com", phone: 11999999999 }),
        createMockRecord({ _rowIndex: 3, email: "b@x.com", phone: 11888888888 }),
      ]

      const queryFn: QueryFn = {
        findByPhones: vi.fn().mockResolvedValue([
          { id: "profile-1", phone: 11999999999 },
          { id: "profile-2", phone: 11888888888 },
        ]),
        findByEmails: vi.fn().mockResolvedValue([]),
      }

      const result = await matchProfiles(records, queryFn)

      expect(result.matched).toHaveLength(2)
      expect(result.matched[0]).toEqual({
        rowIndex: 2,
        profileId: "profile-1",
        matchType: "phone",
        email: "a@x.com",
        phone: 11999999999,
      })
      expect(result.matched[1]).toEqual({
        rowIndex: 3,
        profileId: "profile-2",
        matchType: "phone",
        email: "b@x.com",
        phone: 11888888888,
      })
      expect(result.unmatched).toHaveLength(0)
    })

    it("should not call findByEmails if all records matched by phone", async () => {
      const records: ParsedMailingRecord[] = [
        createMockRecord({ _rowIndex: 2, email: "a@x.com", phone: 11999999999 }),
      ]

      const queryFn: QueryFn = {
        findByPhones: vi.fn().mockResolvedValue([
          { id: "profile-1", phone: 11999999999 },
        ]),
        findByEmails: vi.fn().mockResolvedValue([]),
      }

      await matchProfiles(records, queryFn)

      expect(queryFn.findByEmails).not.toHaveBeenCalled()
    })

    it("should skip records with null phone in phone matching pass", async () => {
      const records: ParsedMailingRecord[] = [
        createMockRecord({ _rowIndex: 2, email: "a@x.com", phone: null }),
      ]

      const queryFn: QueryFn = {
        findByPhones: vi.fn().mockResolvedValue([]),
        findByEmails: vi.fn().mockResolvedValue([
          { id: "profile-1", email: "a@x.com" },
        ]),
      }

      const result = await matchProfiles(records, queryFn)

      expect(queryFn.findByPhones).not.toHaveBeenCalled()
      expect(result.matched).toHaveLength(1)
      expect(result.matched[0].matchType).toBe("email")
    })
  })

  describe("email fallback matching", () => {
    it("should fall back to email when phone does not match", async () => {
      const records: ParsedMailingRecord[] = [
        createMockRecord({ _rowIndex: 2, email: "a@x.com", phone: 11999999999 }),
      ]

      const queryFn: QueryFn = {
        findByPhones: vi.fn().mockResolvedValue([]),
        findByEmails: vi.fn().mockResolvedValue([
          { id: "profile-1", email: "a@x.com" },
        ]),
      }

      const result = await matchProfiles(records, queryFn)

      expect(result.matched).toHaveLength(1)
      expect(result.matched[0]).toEqual({
        rowIndex: 2,
        profileId: "profile-1",
        matchType: "email",
        email: "a@x.com",
        phone: 11999999999,
      })
    })

    it("should handle mixed matching: some by phone, some by email", async () => {
      const records: ParsedMailingRecord[] = [
        createMockRecord({ _rowIndex: 2, email: "a@x.com", phone: 11999999999 }),
        createMockRecord({ _rowIndex: 3, email: "b@x.com", phone: 11888888888 }),
        createMockRecord({ _rowIndex: 4, email: "c@x.com", phone: 11777777777 }),
      ]

      const queryFn: QueryFn = {
        findByPhones: vi.fn().mockResolvedValue([
          { id: "profile-1", phone: 11999999999 },
        ]),
        findByEmails: vi.fn().mockResolvedValue([
          { id: "profile-3", email: "c@x.com" },
        ]),
      }

      const result = await matchProfiles(records, queryFn)

      expect(result.matched).toHaveLength(2)
      expect(result.matched[0].matchType).toBe("phone")
      expect(result.matched[0].profileId).toBe("profile-1")
      expect(result.matched[1].matchType).toBe("email")
      expect(result.matched[1].profileId).toBe("profile-3")

      expect(result.unmatched).toHaveLength(1)
      expect(result.unmatched[0].rowIndex).toBe(3)
    })

    it("should report unmatched records when neither phone nor email matches", async () => {
      const records: ParsedMailingRecord[] = [
        createMockRecord({ _rowIndex: 2, email: "unknown@x.com", phone: 11111111111 }),
      ]

      const queryFn: QueryFn = {
        findByPhones: vi.fn().mockResolvedValue([]),
        findByEmails: vi.fn().mockResolvedValue([]),
      }

      const result = await matchProfiles(records, queryFn)

      expect(result.matched).toHaveLength(0)
      expect(result.unmatched).toHaveLength(1)
      expect(result.unmatched[0]).toEqual({
        rowIndex: 2,
        email: "unknown@x.com",
        phone: 11111111111,
      })
    })
  })

  describe("edge cases", () => {
    it("should handle empty records array", async () => {
      const queryFn: QueryFn = {
        findByPhones: vi.fn().mockResolvedValue([]),
        findByEmails: vi.fn().mockResolvedValue([]),
      }

      const result = await matchProfiles([], queryFn)

      expect(result.matched).toHaveLength(0)
      expect(result.unmatched).toHaveLength(0)
      expect(queryFn.findByPhones).not.toHaveBeenCalled()
      expect(queryFn.findByEmails).not.toHaveBeenCalled()
    })

    it("should handle duplicate phones in spreadsheet (first occurrence wins)", async () => {
      const records: ParsedMailingRecord[] = [
        createMockRecord({ _rowIndex: 2, email: "a@x.com", phone: 11999999999 }),
        createMockRecord({ _rowIndex: 3, email: "b@x.com", phone: 11999999999 }),
      ]

      const queryFn: QueryFn = {
        findByPhones: vi.fn().mockResolvedValue([
          { id: "profile-1", phone: 11999999999 },
        ]),
        findByEmails: vi.fn().mockResolvedValue([]),
      }

      const result = await matchProfiles(records, queryFn)

      // Both records have the same phone, both should match the same profile
      expect(result.matched).toHaveLength(2)
      expect(result.matched[0].profileId).toBe("profile-1")
      expect(result.matched[1].profileId).toBe("profile-1")
    })

    it("should only query unique phones", async () => {
      const records: ParsedMailingRecord[] = [
        createMockRecord({ _rowIndex: 2, email: "a@x.com", phone: 11999999999 }),
        createMockRecord({ _rowIndex: 3, email: "b@x.com", phone: 11999999999 }),
        createMockRecord({ _rowIndex: 4, email: "c@x.com", phone: 11888888888 }),
      ]

      const queryFn: QueryFn = {
        findByPhones: vi.fn().mockResolvedValue([
          { id: "profile-1", phone: 11999999999 },
          { id: "profile-2", phone: 11888888888 },
        ]),
        findByEmails: vi.fn().mockResolvedValue([]),
      }

      await matchProfiles(records, queryFn)

      const calledWithPhones = (queryFn.findByPhones as ReturnType<typeof vi.fn>).mock.calls[0][0] as number[]
      expect(calledWithPhones).toHaveLength(2)
      expect(calledWithPhones).toContain(11999999999)
      expect(calledWithPhones).toContain(11888888888)
    })

    it("should only query unique emails in fallback", async () => {
      const records: ParsedMailingRecord[] = [
        createMockRecord({ _rowIndex: 2, email: "same@x.com", phone: 11999999999 }),
        createMockRecord({ _rowIndex: 3, email: "same@x.com", phone: 11888888888 }),
      ]

      const queryFn: QueryFn = {
        findByPhones: vi.fn().mockResolvedValue([]),
        findByEmails: vi.fn().mockResolvedValue([
          { id: "profile-1", email: "same@x.com" },
        ]),
      }

      await matchProfiles(records, queryFn)

      const calledWithEmails = (queryFn.findByEmails as ReturnType<typeof vi.fn>).mock.calls[0][0] as string[]
      expect(calledWithEmails).toHaveLength(1)
      expect(calledWithEmails[0]).toBe("same@x.com")
    })

    it("should handle all records having null phone", async () => {
      const records: ParsedMailingRecord[] = [
        createMockRecord({ _rowIndex: 2, email: "a@x.com", phone: null }),
        createMockRecord({ _rowIndex: 3, email: "b@x.com", phone: null }),
      ]

      const queryFn: QueryFn = {
        findByPhones: vi.fn().mockResolvedValue([]),
        findByEmails: vi.fn().mockResolvedValue([
          { id: "profile-1", email: "a@x.com" },
        ]),
      }

      const result = await matchProfiles(records, queryFn)

      expect(queryFn.findByPhones).not.toHaveBeenCalled()
      expect(result.matched).toHaveLength(1)
      expect(result.matched[0].matchType).toBe("email")
      expect(result.unmatched).toHaveLength(1)
      expect(result.unmatched[0].email).toBe("b@x.com")
    })
  })
})
