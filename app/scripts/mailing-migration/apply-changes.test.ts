import { describe, expect, it, vi } from "vitest"
import {
  parseReviewedCsv,
  filterApplicableChanges,
  groupChangesByProfile,
  applyChanges,
} from "./apply-changes"
import type { DiffEntry } from "./generate-diff"

describe("parseReviewedCsv", () => {
  it("should parse a simple CSV with header and one data row", () => {
    const csv = `profile_id,nome_do_campo,valor_atual_db,valor_planilha,ação\np1,full_name,João,Maria,usar_planilha\n`

    const result = parseReviewedCsv(csv)

    expect(result).toEqual([
      {
        profile_id: "p1",
        field_name: "full_name",
        db_value: "João",
        spreadsheet_value: "Maria",
        action: "usar_planilha",
      },
    ])
  })

  it("should handle BOM character at the start", () => {
    const csv = `\uFEFFprofile_id,nome_do_campo,valor_atual_db,valor_planilha,ação\np1,rg,,123456,usar_planilha\n`

    const result = parseReviewedCsv(csv)

    expect(result).toHaveLength(1)
    expect(result[0].profile_id).toBe("p1")
  })

  it("should handle quoted fields with commas inside", () => {
    const csv = `profile_id,nome_do_campo,valor_atual_db,valor_planilha,ação\np1,general_notes,"note with, comma","new note, also comma",usar_planilha\n`

    const result = parseReviewedCsv(csv)

    expect(result[0].db_value).toBe("note with, comma")
    expect(result[0].spreadsheet_value).toBe("new note, also comma")
  })

  it("should handle quoted fields with escaped quotes", () => {
    const csv = `profile_id,nome_do_campo,valor_atual_db,valor_planilha,ação\np1,general_notes,"say ""hi""","say ""bye""",manter_db\n`

    const result = parseReviewedCsv(csv)

    expect(result[0].db_value).toBe('say "hi"')
    expect(result[0].spreadsheet_value).toBe('say "bye"')
  })

  it("should handle multiple rows", () => {
    const csv = [
      "profile_id,nome_do_campo,valor_atual_db,valor_planilha,ação",
      "p1,full_name,João,Maria,usar_planilha",
      "p1,rg,,123456,usar_planilha",
      "p2,gender,Masculino,Feminino,manter_db",
      "",
    ].join("\n")

    const result = parseReviewedCsv(csv)

    expect(result).toHaveLength(3)
    expect(result[0].profile_id).toBe("p1")
    expect(result[1].profile_id).toBe("p1")
    expect(result[2].profile_id).toBe("p2")
  })

  it("should handle empty values", () => {
    const csv = `profile_id,nome_do_campo,valor_atual_db,valor_planilha,ação\np1,social_name,,Alex,usar_planilha\n`

    const result = parseReviewedCsv(csv)

    expect(result[0].db_value).toBe("")
    expect(result[0].spreadsheet_value).toBe("Alex")
  })

  it("should skip empty lines", () => {
    const csv = [
      "profile_id,nome_do_campo,valor_atual_db,valor_planilha,ação",
      "p1,full_name,A,B,manter_db",
      "",
      "p2,rg,,123,usar_planilha",
      "",
    ].join("\n")

    const result = parseReviewedCsv(csv)

    expect(result).toHaveLength(2)
  })

  it("should handle all three action types", () => {
    const csv = [
      "profile_id,nome_do_campo,valor_atual_db,valor_planilha,ação",
      "p1,full_name,A,B,manter_db",
      "p2,rg,,123,usar_planilha",
      "p3,gender,M,F,revisão_manual",
      "",
    ].join("\n")

    const result = parseReviewedCsv(csv)

    expect(result[0].action).toBe("manter_db")
    expect(result[1].action).toBe("usar_planilha")
    expect(result[2].action).toBe("revisão_manual")
  })

  it("should throw on invalid action value", () => {
    const csv = [
      "profile_id,nome_do_campo,valor_atual_db,valor_planilha,ação",
      "p1,full_name,A,B,invalid_action",
      "",
    ].join("\n")

    expect(() => parseReviewedCsv(csv)).toThrow(
      'Invalid action "invalid_action" at row 2',
    )
  })

  it("should handle quoted fields with newlines inside", () => {
    const csv = `profile_id,nome_do_campo,valor_atual_db,valor_planilha,ação\np1,general_notes,"line1\nline2","line3\nline4",usar_planilha\n`

    const result = parseReviewedCsv(csv)

    expect(result[0].db_value).toBe("line1\nline2")
    expect(result[0].spreadsheet_value).toBe("line3\nline4")
  })
})

describe("filterApplicableChanges", () => {
  it("should separate entries by action type", () => {
    const entries: DiffEntry[] = [
      {
        profile_id: "p1",
        field_name: "full_name",
        db_value: "",
        spreadsheet_value: "Maria",
        action: "usar_planilha",
      },
      {
        profile_id: "p1",
        field_name: "rg",
        db_value: "123",
        spreadsheet_value: "456",
        action: "manter_db",
      },
      {
        profile_id: "p2",
        field_name: "gender",
        db_value: "M",
        spreadsheet_value: "F",
        action: "revisão_manual",
      },
    ]

    const result = filterApplicableChanges(entries)

    expect(result.toApply).toHaveLength(1)
    expect(result.toApply[0].action).toBe("usar_planilha")
    expect(result.skipped).toHaveLength(1)
    expect(result.skipped[0].action).toBe("manter_db")
    expect(result.unresolved).toHaveLength(1)
    expect(result.unresolved[0].action).toBe("revisão_manual")
  })

  it("should return empty arrays when no entries match", () => {
    const result = filterApplicableChanges([])

    expect(result.toApply).toHaveLength(0)
    expect(result.skipped).toHaveLength(0)
    expect(result.unresolved).toHaveLength(0)
  })

  it("should handle all entries being usar_planilha", () => {
    const entries: DiffEntry[] = [
      {
        profile_id: "p1",
        field_name: "full_name",
        db_value: "",
        spreadsheet_value: "Maria",
        action: "usar_planilha",
      },
      {
        profile_id: "p2",
        field_name: "rg",
        db_value: "",
        spreadsheet_value: "123",
        action: "usar_planilha",
      },
    ]

    const result = filterApplicableChanges(entries)

    expect(result.toApply).toHaveLength(2)
    expect(result.skipped).toHaveLength(0)
    expect(result.unresolved).toHaveLength(0)
  })
})

describe("groupChangesByProfile", () => {
  it("should group entries by profile_id", () => {
    const entries: DiffEntry[] = [
      {
        profile_id: "p1",
        field_name: "full_name",
        db_value: "",
        spreadsheet_value: "Maria",
        action: "usar_planilha",
      },
      {
        profile_id: "p1",
        field_name: "rg",
        db_value: "",
        spreadsheet_value: "123456",
        action: "usar_planilha",
      },
      {
        profile_id: "p2",
        field_name: "social_name",
        db_value: "",
        spreadsheet_value: "Alex",
        action: "usar_planilha",
      },
    ]

    const result = groupChangesByProfile(entries)

    expect(result.size).toBe(2)
    const p1 = result.get("p1")
    const p2 = result.get("p2")
    expect(p1).toBeDefined()
    expect(p2).toBeDefined()
    expect(p1?.fields).toHaveLength(2)
    expect(p2?.fields).toHaveLength(1)
  })

  it("should convert gender to string array", () => {
    const entries: DiffEntry[] = [
      {
        profile_id: "p1",
        field_name: "gender",
        db_value: "",
        spreadsheet_value: "Masculino,Não-binário",
        action: "usar_planilha",
      },
    ]

    const result = groupChangesByProfile(entries)
    const update = result.get("p1")
    expect(update).toBeDefined()
    const field = update?.fields[0]

    expect(field?.fieldName).toBe("gender")
    expect(field?.newValue).toEqual(["Masculino", "Não-binário"])
  })

  it("should convert orientation to string array", () => {
    const entries: DiffEntry[] = [
      {
        profile_id: "p1",
        field_name: "orientation",
        db_value: "",
        spreadsheet_value: "Bissexual,Pansexual",
        action: "usar_planilha",
      },
    ]

    const result = groupChangesByProfile(entries)
    const update = result.get("p1")
    expect(update).toBeDefined()
    const field = update?.fields[0]

    expect(field?.newValue).toEqual(["Bissexual", "Pansexual"])
  })

  it("should convert pronouns to string array", () => {
    const entries: DiffEntry[] = [
      {
        profile_id: "p1",
        field_name: "pronouns",
        db_value: "",
        spreadsheet_value: "Ele/Dele,Elu/Delu",
        action: "usar_planilha",
      },
    ]

    const result = groupChangesByProfile(entries)
    const update = result.get("p1")
    expect(update).toBeDefined()
    const field = update?.fields[0]

    expect(field?.newValue).toEqual(["Ele/Dele", "Elu/Delu"])
  })

  it("should keep approved_to_attend as string", () => {
    const entries: DiffEntry[] = [
      {
        profile_id: "p1",
        field_name: "approved_to_attend",
        db_value: "pending",
        spreadsheet_value: "rejected",
        action: "usar_planilha",
      },
    ]

    const result = groupChangesByProfile(entries)
    const update = result.get("p1")
    expect(update).toBeDefined()
    const field = update?.fields[0]

    expect(field?.newValue).toBe("rejected")
  })

  it("should keep flag as string", () => {
    const entries: DiffEntry[] = [
      {
        profile_id: "p1",
        field_name: "flag",
        db_value: "none",
        spreadsheet_value: "red",
        action: "usar_planilha",
      },
    ]

    const result = groupChangesByProfile(entries)
    const update = result.get("p1")
    expect(update).toBeDefined()
    const field = update?.fields[0]

    expect(field?.newValue).toBe("red")
  })

  it("should treat empty string as null for regular string fields", () => {
    const entries: DiffEntry[] = [
      {
        profile_id: "p1",
        field_name: "social_name",
        db_value: "Alex",
        spreadsheet_value: "",
        action: "usar_planilha",
      },
    ]

    const result = groupChangesByProfile(entries)
    const update = result.get("p1")
    expect(update).toBeDefined()
    const field = update?.fields[0]

    expect(field?.newValue).toBeNull()
  })

  it("should keep non-empty strings as-is for regular fields", () => {
    const entries: DiffEntry[] = [
      {
        profile_id: "p1",
        field_name: "full_name",
        db_value: "",
        spreadsheet_value: "João Silva",
        action: "usar_planilha",
      },
    ]

    const result = groupChangesByProfile(entries)
    const update = result.get("p1")
    expect(update).toBeDefined()
    const field = update?.fields[0]

    expect(field?.newValue).toBe("João Silva")
  })

  it("should handle empty array fields as empty array", () => {
    const entries: DiffEntry[] = [
      {
        profile_id: "p1",
        field_name: "gender",
        db_value: "Masculino",
        spreadsheet_value: "",
        action: "usar_planilha",
      },
    ]

    const result = groupChangesByProfile(entries)
    const update = result.get("p1")
    expect(update).toBeDefined()
    const field = update?.fields[0]

    expect(field?.newValue).toEqual([])
  })
})

describe("applyChanges", () => {
  it("should call updateProfile for each profile update", async () => {
    const updates = new Map([
      [
        "p1",
        {
          profileId: "p1",
          fields: [
            { fieldName: "full_name", newValue: "Maria" },
            { fieldName: "rg", newValue: "123456" },
          ],
        },
      ],
      [
        "p2",
        {
          profileId: "p2",
          fields: [{ fieldName: "social_name", newValue: "Alex" }],
        },
      ],
    ])

    const updateProfile = vi.fn().mockResolvedValue(undefined)

    await applyChanges(updates, { updateProfile })

    expect(updateProfile).toHaveBeenCalledTimes(2)
    expect(updateProfile).toHaveBeenCalledWith("p1", {
      full_name: "Maria",
      rg: "123456",
    })
    expect(updateProfile).toHaveBeenCalledWith("p2", {
      social_name: "Alex",
    })
  })

  it("should return a change log with all applied changes", async () => {
    const updates = new Map([
      [
        "p1",
        {
          profileId: "p1",
          fields: [{ fieldName: "full_name", newValue: "Maria" }],
        },
      ],
    ])

    const updateProfile = vi.fn().mockResolvedValue(undefined)

    const log = await applyChanges(updates, { updateProfile })

    expect(log).toHaveLength(1)
    expect(log[0]).toEqual({
      profileId: "p1",
      fieldName: "full_name",
      newValue: "Maria",
    })
  })

  it("should handle multiple fields per profile in the log", async () => {
    const updates = new Map([
      [
        "p1",
        {
          profileId: "p1",
          fields: [
            { fieldName: "full_name", newValue: "Maria" },
            { fieldName: "rg", newValue: "123" },
          ],
        },
      ],
    ])

    const updateProfile = vi.fn().mockResolvedValue(undefined)

    const log = await applyChanges(updates, { updateProfile })

    expect(log).toHaveLength(2)
    expect(log[0].fieldName).toBe("full_name")
    expect(log[1].fieldName).toBe("rg")
  })

  it("should propagate errors from updateProfile", async () => {
    const updates = new Map([
      [
        "p1",
        {
          profileId: "p1",
          fields: [{ fieldName: "full_name", newValue: "Maria" }],
        },
      ],
    ])

    const updateProfile = vi
      .fn()
      .mockRejectedValue(new Error("DB connection failed"))

    await expect(applyChanges(updates, { updateProfile })).rejects.toThrow(
      "DB connection failed",
    )
  })

  it("should handle empty updates map", async () => {
    const updates = new Map()
    const updateProfile = vi.fn()

    const log = await applyChanges(updates, { updateProfile })

    expect(log).toHaveLength(0)
    expect(updateProfile).not.toHaveBeenCalled()
  })
})
