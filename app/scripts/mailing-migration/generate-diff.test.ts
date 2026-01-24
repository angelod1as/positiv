import { describe, expect, it, vi } from "vitest"
import {
  isEmpty,
  formatValue,
  compareField,
  diffProfile,
  generateDiff,
  escapeCsvField,
  formatDiffCsv,
  type DiffAction,
  type DiffEntry,
  type ProfileData,
  type ProfileQueryFn,
} from "./generate-diff"
import type { ParsedMailingRecord } from "./parse-csv"
import type { MatchedRecord } from "./match-profiles"

function createMockProfile(
  overrides: Partial<ProfileData> & { id: string; email: string },
): ProfileData {
  return {
    full_name: null,
    social_name: null,
    gender: null,
    orientation: null,
    pronouns: null,
    phone: null,
    rg: null,
    approved_to_attend: "pending",
    flag: "none",
    general_notes: null,
    ...overrides,
  }
}

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

describe("isEmpty", () => {
  it("should return true for null", () => {
    expect(isEmpty(null)).toBe(true)
  })

  it("should return true for undefined", () => {
    expect(isEmpty(undefined)).toBe(true)
  })

  it("should return true for empty string", () => {
    expect(isEmpty("")).toBe(true)
  })

  it("should return true for empty array", () => {
    expect(isEmpty([])).toBe(true)
  })

  it("should return false for non-empty string", () => {
    expect(isEmpty("hello")).toBe(false)
  })

  it("should return false for non-empty array", () => {
    expect(isEmpty(["a", "b"])).toBe(false)
  })

  it("should return false for a number", () => {
    expect(isEmpty(42)).toBe(false)
  })

  it("should return false for zero", () => {
    expect(isEmpty(0)).toBe(false)
  })
})

describe("formatValue", () => {
  it("should return empty string for null", () => {
    expect(formatValue(null)).toBe("")
  })

  it("should return empty string for undefined", () => {
    expect(formatValue(undefined)).toBe("")
  })

  it("should join array with comma", () => {
    expect(formatValue(["a", "b", "c"])).toBe("a,b,c")
  })

  it("should return empty string for empty array", () => {
    expect(formatValue([])).toBe("")
  })

  it("should convert number to string", () => {
    expect(formatValue(11999999999)).toBe("11999999999")
  })

  it("should return string as-is", () => {
    expect(formatValue("hello")).toBe("hello")
  })
})

describe("compareField", () => {
  it("should return null when both values are empty", () => {
    expect(compareField(null, null)).toBeNull()
  })

  it("should return null when db is empty string and sheet is null", () => {
    expect(compareField("", null)).toBeNull()
  })

  it("should return null when db is empty array and sheet is null", () => {
    expect(compareField([], null)).toBeNull()
  })

  it("should return 'manter_db' when db has value but sheet is empty", () => {
    expect(compareField("João", null)).toBe("manter_db" satisfies DiffAction)
  })

  it("should return 'manter_db' when db has array but sheet is empty", () => {
    expect(compareField(["Masculino"], null)).toBe(
      "manter_db" satisfies DiffAction,
    )
  })

  it("should return 'usar_planilha' when db is empty but sheet has value", () => {
    expect(compareField(null, "João")).toBe(
      "usar_planilha" satisfies DiffAction,
    )
  })

  it("should return 'usar_planilha' when db is empty array but sheet has value", () => {
    expect(compareField([], ["Feminino"])).toBe(
      "usar_planilha" satisfies DiffAction,
    )
  })

  it("should return null when both values are equal strings", () => {
    expect(compareField("João", "João")).toBeNull()
  })

  it("should return null when both values are equal arrays (same order)", () => {
    expect(compareField(["a", "b"], ["a", "b"])).toBeNull()
  })

  it("should return null when both values are equal arrays (different order)", () => {
    expect(compareField(["b", "a"], ["a", "b"])).toBeNull()
  })

  it("should return 'revisão_manual' when both have different values", () => {
    expect(compareField("João", "Maria")).toBe(
      "revisão_manual" satisfies DiffAction,
    )
  })

  it("should return 'revisão_manual' when arrays differ", () => {
    expect(compareField(["Masculino"], ["Feminino"])).toBe(
      "revisão_manual" satisfies DiffAction,
    )
  })

  it("should compare numbers correctly when equal", () => {
    expect(compareField(11999999999, 11999999999)).toBeNull()
  })

  it("should return 'revisão_manual' when numbers differ", () => {
    expect(compareField(11999999999, 11888888888)).toBe(
      "revisão_manual" satisfies DiffAction,
    )
  })
})

describe("diffProfile", () => {
  it("should return empty array when all fields match", () => {
    const profile = createMockProfile({
      id: "p1",
      email: "a@x.com",
      full_name: "João",
      flag: "none",
      approved_to_attend: "pending",
    })
    const record = createMockParsedRecord({
      _rowIndex: 2,
      email: "a@x.com",
      full_name: "João",
      flag: "none",
      approved_to_attend: "pending",
    })

    const entries = diffProfile(profile, record)
    expect(entries).toHaveLength(0)
  })

  it("should resolve conflicts as manter_db for regular fields", () => {
    const profile = createMockProfile({
      id: "p1",
      email: "a@x.com",
      full_name: "João",
      flag: "none",
      approved_to_attend: "approved",
    })
    const record = createMockParsedRecord({
      _rowIndex: 2,
      email: "a@x.com",
      full_name: "Maria",
      flag: "none",
      approved_to_attend: "approved",
    })

    const entries = diffProfile(profile, record)
    expect(entries).toHaveLength(1)
    expect(entries[0]).toEqual({
      profile_id: "p1",
      field_name: "full_name",
      db_value: "João",
      spreadsheet_value: "Maria",
      action: "manter_db",
    })
  })

  it("should handle usar_planilha when db is empty and sheet has value", () => {
    const profile = createMockProfile({
      id: "p1",
      email: "a@x.com",
      full_name: null,
    })
    const record = createMockParsedRecord({
      _rowIndex: 2,
      email: "a@x.com",
      full_name: "João",
    })

    const entries = diffProfile(profile, record)
    expect(entries).toContainEqual(
      expect.objectContaining({
        field_name: "full_name",
        action: "usar_planilha",
        db_value: "",
        spreadsheet_value: "João",
      }),
    )
  })

  it("should handle manter_db when db has value and sheet is empty", () => {
    const profile = createMockProfile({
      id: "p1",
      email: "a@x.com",
      rg: "123456789",
    })
    const record = createMockParsedRecord({
      _rowIndex: 2,
      email: "a@x.com",
      rg: null,
    })

    const entries = diffProfile(profile, record)
    expect(entries).toContainEqual(
      expect.objectContaining({
        field_name: "rg",
        action: "manter_db",
        db_value: "123456789",
        spreadsheet_value: "",
      }),
    )
  })

  it("should format arrays as comma-joined in output", () => {
    const profile = createMockProfile({
      id: "p1",
      email: "a@x.com",
      gender: ["Masculino"],
    })
    const record = createMockParsedRecord({
      _rowIndex: 2,
      email: "a@x.com",
      gender: ["Feminino", "Não-binário"],
    })

    const entries = diffProfile(profile, record)
    expect(entries).toContainEqual(
      expect.objectContaining({
        field_name: "gender",
        db_value: "Masculino",
        spreadsheet_value: "Feminino,Não-binário",
      }),
    )
  })

  it("should append general_notes with [mailing] prefix", () => {
    const profile = createMockProfile({
      id: "p1",
      email: "a@x.com",
      general_notes: "Existing note",
    })
    const record = createMockParsedRecord({
      _rowIndex: 2,
      email: "a@x.com",
      general_notes: "New info",
    })

    const entries = diffProfile(profile, record)
    expect(entries).toContainEqual(
      expect.objectContaining({
        field_name: "general_notes",
        db_value: "Existing note",
        spreadsheet_value: "Existing note. [mailing] New info",
        action: "usar_planilha",
      }),
    )
  })

  it("should use [mailing] prefix when db notes is empty", () => {
    const profile = createMockProfile({
      id: "p1",
      email: "a@x.com",
      general_notes: null,
    })
    const record = createMockParsedRecord({
      _rowIndex: 2,
      email: "a@x.com",
      general_notes: "New note",
    })

    const entries = diffProfile(profile, record)
    expect(entries).toContainEqual(
      expect.objectContaining({
        field_name: "general_notes",
        spreadsheet_value: "[mailing] New note",
        action: "usar_planilha",
      }),
    )
  })

  it("should keep flag differences as revisão_manual", () => {
    const profile = createMockProfile({
      id: "p1",
      email: "a@x.com",
      flag: "red",
    })
    const record = createMockParsedRecord({
      _rowIndex: 2,
      email: "a@x.com",
      flag: "none",
    })

    const entries = diffProfile(profile, record)
    expect(entries).toContainEqual(
      expect.objectContaining({
        field_name: "flag",
        action: "revisão_manual",
      }),
    )
  })

  it("should skip case-only differences", () => {
    const profile = createMockProfile({
      id: "p1",
      email: "a@x.com",
      full_name: "João Silva",
    })
    const record = createMockParsedRecord({
      _rowIndex: 2,
      email: "a@x.com",
      full_name: "joão silva",
    })

    const entries = diffProfile(profile, record)
    const nameEntry = entries.find((e) => e.field_name === "full_name")
    expect(nameEntry).toBeUndefined()
  })

  it("should treat social_name 'Não tenho' as empty", () => {
    const profile = createMockProfile({
      id: "p1",
      email: "a@x.com",
      social_name: "Não Tenho",
    })
    const record = createMockParsedRecord({
      _rowIndex: 2,
      email: "a@x.com",
      social_name: null,
    })

    const entries = diffProfile(profile, record)
    const snEntry = entries.find((e) => e.field_name === "social_name")
    expect(snEntry).toBeUndefined()
  })

  it("should resolve approved_to_attend: DB pending + sheet rejected → usar_planilha", () => {
    const profile = createMockProfile({
      id: "p1",
      email: "a@x.com",
      approved_to_attend: "pending",
    })
    const record = createMockParsedRecord({
      _rowIndex: 2,
      email: "a@x.com",
      approved_to_attend: "rejected",
    })

    const entries = diffProfile(profile, record)
    expect(entries).toContainEqual(
      expect.objectContaining({
        field_name: "approved_to_attend",
        action: "usar_planilha",
      }),
    )
  })

  it("should resolve approved_to_attend: DB approved + sheet pending → manter_db", () => {
    const profile = createMockProfile({
      id: "p1",
      email: "a@x.com",
      approved_to_attend: "approved",
    })
    const record = createMockParsedRecord({
      _rowIndex: 2,
      email: "a@x.com",
      approved_to_attend: "pending",
    })

    const entries = diffProfile(profile, record)
    expect(entries).toContainEqual(
      expect.objectContaining({
        field_name: "approved_to_attend",
        action: "manter_db",
      }),
    )
  })
})

describe("generateDiff", () => {
  it("should fetch profiles and generate diff entries", async () => {
    const matched: MatchedRecord[] = [
      {
        rowIndex: 2,
        profileId: "p1",
        matchType: "phone",
        email: "a@x.com",
        phone: 11999999999,
      },
    ]
    const parsed: ParsedMailingRecord[] = [
      createMockParsedRecord({
        _rowIndex: 2,
        email: "a@x.com",
        full_name: "Maria",
        flag: "none",
        approved_to_attend: "pending",
      }),
    ]
    const queryFn: ProfileQueryFn = {
      findByIds: vi.fn().mockResolvedValue([
        createMockProfile({
          id: "p1",
          email: "a@x.com",
          full_name: "João",
          flag: "none",
          approved_to_attend: "pending",
        }),
      ]),
    }

    const entries = await generateDiff(matched, parsed, queryFn)

    expect(queryFn.findByIds).toHaveBeenCalledWith(["p1"])
    expect(entries.length).toBeGreaterThan(0)
    const nameEntry = entries.find((e) => e.field_name === "full_name")
    expect(nameEntry).toEqual({
      profile_id: "p1",
      field_name: "full_name",
      db_value: "João",
      spreadsheet_value: "Maria",
      action: "manter_db",
    })
  })

  it("should skip profiles not found in DB", async () => {
    const matched: MatchedRecord[] = [
      {
        rowIndex: 2,
        profileId: "p1",
        matchType: "phone",
        email: "a@x.com",
        phone: 11999999999,
      },
    ]
    const parsed: ParsedMailingRecord[] = [
      createMockParsedRecord({ _rowIndex: 2, email: "a@x.com" }),
    ]
    const queryFn: ProfileQueryFn = {
      findByIds: vi.fn().mockResolvedValue([]),
    }

    const entries = await generateDiff(matched, parsed, queryFn)
    expect(entries).toHaveLength(0)
  })

  it("should handle multiple matched records", async () => {
    const matched: MatchedRecord[] = [
      {
        rowIndex: 2,
        profileId: "p1",
        matchType: "phone",
        email: "a@x.com",
        phone: 11999999999,
      },
      {
        rowIndex: 3,
        profileId: "p2",
        matchType: "email",
        email: "b@x.com",
        phone: null,
      },
    ]
    const parsed: ParsedMailingRecord[] = [
      createMockParsedRecord({
        _rowIndex: 2,
        email: "a@x.com",
        full_name: "Name A",
      }),
      createMockParsedRecord({
        _rowIndex: 3,
        email: "b@x.com",
        full_name: "Name B",
      }),
    ]
    const queryFn: ProfileQueryFn = {
      findByIds: vi.fn().mockResolvedValue([
        createMockProfile({ id: "p1", email: "a@x.com", full_name: "Old A" }),
        createMockProfile({ id: "p2", email: "b@x.com", full_name: "Old B" }),
      ]),
    }

    const entries = await generateDiff(matched, parsed, queryFn)

    const p1Entries = entries.filter((e) => e.profile_id === "p1")
    const p2Entries = entries.filter((e) => e.profile_id === "p2")
    expect(p1Entries.length).toBeGreaterThan(0)
    expect(p2Entries.length).toBeGreaterThan(0)
  })
})

describe("escapeCsvField", () => {
  it("should return simple values unchanged", () => {
    expect(escapeCsvField("hello")).toBe("hello")
  })

  it("should wrap values with commas in quotes", () => {
    expect(escapeCsvField("a,b")).toBe('"a,b"')
  })

  it("should wrap values with quotes in quotes and escape inner quotes", () => {
    expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""')
  })

  it("should wrap values with newlines in quotes", () => {
    expect(escapeCsvField("line1\nline2")).toBe('"line1\nline2"')
  })

  it("should handle empty string", () => {
    expect(escapeCsvField("")).toBe("")
  })

  it("should handle value with all special characters", () => {
    expect(escapeCsvField('a,b\n"c"')).toBe('"a,b\n""c"""')
  })
})

describe("formatDiffCsv", () => {
  it("should produce CSV with BOM and header when entries is empty", () => {
    const result = formatDiffCsv([])
    expect(result).toBe(
      "\uFEFFprofile_id,nome_do_campo,valor_atual_db,valor_planilha,ação\n",
    )
  })

  it("should produce correct CSV rows for entries", () => {
    const entries: DiffEntry[] = [
      {
        profile_id: "p1",
        field_name: "full_name",
        db_value: "João",
        spreadsheet_value: "Maria",
        action: "revisão_manual",
      },
    ]

    const result = formatDiffCsv(entries)
    const lines = result.split("\n")
    expect(lines[0]).toBe(
      "\uFEFFprofile_id,nome_do_campo,valor_atual_db,valor_planilha,ação",
    )
    expect(lines[1]).toBe("p1,full_name,João,Maria,revisão_manual")
  })

  it("should escape fields with special characters", () => {
    const entries: DiffEntry[] = [
      {
        profile_id: "p1",
        field_name: "general_notes",
        db_value: "note with, comma",
        spreadsheet_value: 'note with "quotes"',
        action: "revisão_manual",
      },
    ]

    const result = formatDiffCsv(entries)
    const lines = result.split("\n")
    expect(lines[1]).toBe(
      'p1,general_notes,"note with, comma","note with ""quotes""",revisão_manual',
    )
  })

  it("should handle multiple entries", () => {
    const entries: DiffEntry[] = [
      {
        profile_id: "p1",
        field_name: "full_name",
        db_value: "A",
        spreadsheet_value: "B",
        action: "revisão_manual",
      },
      {
        profile_id: "p1",
        field_name: "email",
        db_value: "",
        spreadsheet_value: "a@x.com",
        action: "usar_planilha",
      },
    ]

    const result = formatDiffCsv(entries)
    const lines = result.split("\n")
    expect(lines).toHaveLength(4) // header + 2 rows + trailing newline
    expect(lines[1]).toBe("p1,full_name,A,B,revisão_manual")
    expect(lines[2]).toBe("p1,email,,a@x.com,usar_planilha")
  })
})
