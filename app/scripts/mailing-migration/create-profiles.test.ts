import { describe, expect, it, vi } from "vitest"
import { buildProfileInserts, createProfiles } from "./create-profiles"
import type { ParsedMailingRecord } from "./parse-csv"
import type { UnmatchedRecord } from "./match-profiles"

function createMockParsedRecord(
  overrides: Partial<ParsedMailingRecord> & {
    _rowIndex: number
    email: string
  },
): ParsedMailingRecord {
  return {
    full_name: "",
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

describe("buildProfileInserts", () => {
  it("should map unmatched records to profile insert data", () => {
    const unmatched: UnmatchedRecord[] = [
      { rowIndex: 2, email: "a@x.com", phone: 11999999999 },
    ]
    const parsed: ParsedMailingRecord[] = [
      createMockParsedRecord({
        _rowIndex: 2,
        email: "a@x.com",
        full_name: "João Silva",
        phone: 11999999999,
      }),
    ]

    const result = buildProfileInserts(unmatched, parsed)

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      email: "a@x.com",
      full_name: "João Silva",
      social_name: null,
      gender: null,
      orientation: null,
      pronouns: null,
      phone: 11999999999,
      rg: null,
      flag: "none",
      approved_to_attend: "pending",
      general_notes: null,
      basic_data_filled: false,
    })
  })

  it("should prefix general_notes with [mailing]", () => {
    const unmatched: UnmatchedRecord[] = [
      { rowIndex: 2, email: "a@x.com", phone: null },
    ]
    const parsed: ParsedMailingRecord[] = [
      createMockParsedRecord({
        _rowIndex: 2,
        email: "a@x.com",
        general_notes: "Some important note",
      }),
    ]

    const result = buildProfileInserts(unmatched, parsed)

    expect(result[0].general_notes).toBe("[mailing] Some important note")
  })

  it("should keep general_notes as null when not present", () => {
    const unmatched: UnmatchedRecord[] = [
      { rowIndex: 2, email: "a@x.com", phone: null },
    ]
    const parsed: ParsedMailingRecord[] = [
      createMockParsedRecord({
        _rowIndex: 2,
        email: "a@x.com",
        general_notes: null,
      }),
    ]

    const result = buildProfileInserts(unmatched, parsed)

    expect(result[0].general_notes).toBeNull()
  })

  it("should handle multiple unmatched records", () => {
    const unmatched: UnmatchedRecord[] = [
      { rowIndex: 2, email: "a@x.com", phone: null },
      { rowIndex: 5, email: "b@x.com", phone: 11888888888 },
    ]
    const parsed: ParsedMailingRecord[] = [
      createMockParsedRecord({ _rowIndex: 2, email: "a@x.com", full_name: "A" }),
      createMockParsedRecord({ _rowIndex: 3, email: "c@x.com", full_name: "C" }),
      createMockParsedRecord({ _rowIndex: 5, email: "b@x.com", full_name: "B" }),
    ]

    const result = buildProfileInserts(unmatched, parsed)

    expect(result).toHaveLength(2)
    expect(result[0].email).toBe("a@x.com")
    expect(result[0].full_name).toBe("A")
    expect(result[1].email).toBe("b@x.com")
    expect(result[1].full_name).toBe("B")
  })

  it("should skip unmatched records without a matching parsed record", () => {
    const unmatched: UnmatchedRecord[] = [
      { rowIndex: 99, email: "missing@x.com", phone: null },
    ]
    const parsed: ParsedMailingRecord[] = [
      createMockParsedRecord({ _rowIndex: 2, email: "a@x.com" }),
    ]

    const result = buildProfileInserts(unmatched, parsed)

    expect(result).toHaveLength(0)
  })

  it("should map all array fields correctly", () => {
    const unmatched: UnmatchedRecord[] = [
      { rowIndex: 2, email: "a@x.com", phone: null },
    ]
    const parsed: ParsedMailingRecord[] = [
      createMockParsedRecord({
        _rowIndex: 2,
        email: "a@x.com",
        gender: ["Feminino", "Não-binário"],
        orientation: ["Bissexual"],
        pronouns: ["Ela/Dela"],
      }),
    ]

    const result = buildProfileInserts(unmatched, parsed)

    expect(result[0].gender).toEqual(["Feminino", "Não-binário"])
    expect(result[0].orientation).toEqual(["Bissexual"])
    expect(result[0].pronouns).toEqual(["Ela/Dela"])
  })

  it("should set basic_data_filled to false for all inserts", () => {
    const unmatched: UnmatchedRecord[] = [
      { rowIndex: 2, email: "a@x.com", phone: null },
      { rowIndex: 3, email: "b@x.com", phone: null },
    ]
    const parsed: ParsedMailingRecord[] = [
      createMockParsedRecord({ _rowIndex: 2, email: "a@x.com" }),
      createMockParsedRecord({ _rowIndex: 3, email: "b@x.com" }),
    ]

    const result = buildProfileInserts(unmatched, parsed)

    expect(result.every((r) => r.basic_data_filled === false)).toBe(true)
  })

  it("should map flag and approved_to_attend values", () => {
    const unmatched: UnmatchedRecord[] = [
      { rowIndex: 2, email: "a@x.com", phone: null },
    ]
    const parsed: ParsedMailingRecord[] = [
      createMockParsedRecord({
        _rowIndex: 2,
        email: "a@x.com",
        flag: "red",
        approved_to_attend: "rejected",
      }),
    ]

    const result = buildProfileInserts(unmatched, parsed)

    expect(result[0].flag).toBe("red")
    expect(result[0].approved_to_attend).toBe("rejected")
  })
})

describe("createProfiles", () => {
  it("should call insertProfile for each insert", async () => {
    const inserts = [
      {
        email: "a@x.com",
        full_name: "A",
        social_name: null,
        gender: null,
        orientation: null,
        pronouns: null,
        phone: null,
        rg: null,
        flag: "none" as const,
        approved_to_attend: "pending" as const,
        general_notes: null,
        basic_data_filled: false,
      },
      {
        email: "b@x.com",
        full_name: "B",
        social_name: null,
        gender: null,
        orientation: null,
        pronouns: null,
        phone: null,
        rg: null,
        flag: "none" as const,
        approved_to_attend: "pending" as const,
        general_notes: null,
        basic_data_filled: false,
      },
    ]

    const insertProfile = vi
      .fn()
      .mockResolvedValueOnce("id-1")
      .mockResolvedValueOnce("id-2")

    const result = await createProfiles(inserts, { insertProfile })

    expect(insertProfile).toHaveBeenCalledTimes(2)
    expect(result).toEqual(["id-1", "id-2"])
  })

  it("should pass all fields to insertProfile", async () => {
    const inserts = [
      {
        email: "a@x.com",
        full_name: "João",
        social_name: "Jo",
        gender: ["Masculino"] as string[],
        orientation: ["Heterossexual"] as string[],
        pronouns: ["Ele/Dele"] as string[],
        phone: 11999999999,
        rg: "123456",
        flag: "red" as const,
        approved_to_attend: "rejected" as const,
        general_notes: "[mailing] Note",
        basic_data_filled: false,
      },
    ]

    const insertProfile = vi.fn().mockResolvedValue("id-1")

    await createProfiles(inserts, { insertProfile })

    expect(insertProfile).toHaveBeenCalledWith({
      email: "a@x.com",
      full_name: "João",
      social_name: "Jo",
      gender: ["Masculino"],
      orientation: ["Heterossexual"],
      pronouns: ["Ele/Dele"],
      phone: 11999999999,
      rg: "123456",
      flag: "red",
      approved_to_attend: "rejected",
      general_notes: "[mailing] Note",
      basic_data_filled: false,
    })
  })

  it("should return empty array when no inserts", async () => {
    const insertProfile = vi.fn()

    const result = await createProfiles([], { insertProfile })

    expect(result).toEqual([])
    expect(insertProfile).not.toHaveBeenCalled()
  })

  it("should propagate errors from insertProfile", async () => {
    const inserts = [
      {
        email: "a@x.com",
        full_name: "A",
        social_name: null,
        gender: null,
        orientation: null,
        pronouns: null,
        phone: null,
        rg: null,
        flag: "none" as const,
        approved_to_attend: "pending" as const,
        general_notes: null,
        basic_data_filled: false,
      },
    ]

    const insertProfile = vi
      .fn()
      .mockRejectedValue(new Error("Duplicate email"))

    await expect(createProfiles(inserts, { insertProfile })).rejects.toThrow(
      "Duplicate email",
    )
  })
})
