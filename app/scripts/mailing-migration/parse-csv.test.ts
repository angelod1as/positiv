import { describe, expect, it } from "vitest"
import {
  mapFlagAndApproval,
  mapToArray,
  normalizeName,
  normalizePhone,
  parseBoolean,
  parseMailingRow,
  validateEmail,
} from "./parse-csv"

describe("parse-csv", () => {
  describe("validateEmail", () => {
    it("should return lowercase valid email", () => {
      expect(validateEmail("Test@Example.COM")).toBe("test@example.com")
    })

    it("should return valid email unchanged if already lowercase", () => {
      expect(validateEmail("user@domain.com")).toBe("user@domain.com")
    })

    it("should return null for invalid email without @", () => {
      expect(validateEmail("invalidemail")).toBeNull()
    })

    it("should return null for invalid email without domain", () => {
      expect(validateEmail("user@")).toBeNull()
    })

    it("should return null for invalid email without local part", () => {
      expect(validateEmail("@domain.com")).toBeNull()
    })

    it("should return null for empty string", () => {
      expect(validateEmail("")).toBeNull()
    })

    it("should trim whitespace and validate", () => {
      expect(validateEmail("  user@example.com  ")).toBe("user@example.com")
    })

    it("should return null for email with spaces in middle", () => {
      expect(validateEmail("user @example.com")).toBeNull()
    })
  })

  describe("normalizePhone", () => {
    it("should strip non-digit characters and return as number", () => {
      expect(normalizePhone("(11) 99999-9999")).toBe(11999999999)
    })

    it("should handle phone with country code", () => {
      expect(normalizePhone("+55 11 99999-9999")).toBe(5511999999999)
    })

    it("should handle phone already as digits only", () => {
      expect(normalizePhone("11999999999")).toBe(11999999999)
    })

    it("should return null for empty string", () => {
      expect(normalizePhone("")).toBeNull()
    })

    it("should return null for whitespace only", () => {
      expect(normalizePhone("   ")).toBeNull()
    })

    it("should handle phone with dots", () => {
      expect(normalizePhone("11.99999.9999")).toBe(11999999999)
    })

    it("should return null for non-phone text", () => {
      expect(normalizePhone("not a phone")).toBeNull()
    })

    it("should return number even for short sequences", () => {
      expect(normalizePhone("123")).toBe(123)
    })
  })

  describe("mapFlagAndApproval", () => {
    it("should return none/rejected for empty flag and FALSE", () => {
      expect(mapFlagAndApproval("", "FALSE")).toEqual({
        flag: "none",
        approved_to_attend: "rejected",
      })
    })

    it("should return none/rejected for empty flag and Não", () => {
      expect(mapFlagAndApproval("", "Não")).toEqual({
        flag: "none",
        approved_to_attend: "rejected",
      })
    })

    it("should return none/approved for empty flag and TRUE", () => {
      expect(mapFlagAndApproval("", "TRUE")).toEqual({
        flag: "none",
        approved_to_attend: "approved",
      })
    })

    it("should return none/approved for empty flag and Sim", () => {
      expect(mapFlagAndApproval("", "Sim")).toEqual({
        flag: "none",
        approved_to_attend: "approved",
      })
    })

    it("should return yellow/approved_with_reservations for 🤔 and TRUE", () => {
      expect(mapFlagAndApproval("🤔", "TRUE")).toEqual({
        flag: "yellow",
        approved_to_attend: "approved_with_reservations",
      })
    })

    it("should return yellow/approved_with_reservations for ⚠️ and TRUE", () => {
      expect(mapFlagAndApproval("⚠️", "TRUE")).toEqual({
        flag: "yellow",
        approved_to_attend: "approved_with_reservations",
      })
    })

    it("should return red/rejected for 🚨 and TRUE (red flag overrides approval)", () => {
      expect(mapFlagAndApproval("🚨", "TRUE")).toEqual({
        flag: "red",
        approved_to_attend: "rejected",
      })
    })

    it("should return red/rejected for 🚨 and FALSE", () => {
      expect(mapFlagAndApproval("🚨", "FALSE")).toEqual({
        flag: "red",
        approved_to_attend: "rejected",
      })
    })

    it("should return red/rejected for 🚨 and Não", () => {
      expect(mapFlagAndApproval("🚨", "Não")).toEqual({
        flag: "red",
        approved_to_attend: "rejected",
      })
    })

    it("should handle whitespace around flag", () => {
      expect(mapFlagAndApproval("  🤔  ", "TRUE")).toEqual({
        flag: "yellow",
        approved_to_attend: "approved_with_reservations",
      })
    })

    it("should return none/pending for empty flag and Não sei", () => {
      expect(mapFlagAndApproval("", "Não sei")).toEqual({
        flag: "none",
        approved_to_attend: "pending",
      })
    })

    it("should return none/pending for empty flag and empty approval", () => {
      expect(mapFlagAndApproval("", "")).toEqual({
        flag: "none",
        approved_to_attend: "pending",
      })
    })
  })

  describe("mapToArray", () => {
    describe("gender validation", () => {
      it("should wrap single valid gender in array", () => {
        expect(mapToArray("Homem cis", "gender")).toEqual(["Homem cis"])
      })

      it("should return null for empty string", () => {
        expect(mapToArray("", "gender")).toBeNull()
      })

      it("should return null for whitespace only", () => {
        expect(mapToArray("   ", "gender")).toBeNull()
      })

      it("should handle multiple genders separated by comma", () => {
        expect(mapToArray("Homem cis, Mulher trans", "gender")).toEqual([
          "Homem cis",
          "Mulher trans",
        ])
      })

      it("should return error info for invalid gender", () => {
        const result = mapToArray("Invalid Gender", "gender")
        expect(result).toEqual({
          error: true,
          value: "Invalid Gender",
          validOptions: expect.any(Array),
        })
      })
    })

    describe("orientation validation", () => {
      it("should wrap single valid orientation in array", () => {
        expect(mapToArray("Bi", "orientation")).toEqual(["Bi"])
      })

      it("should handle multiple orientations", () => {
        expect(mapToArray("Hétero, Demi", "orientation")).toEqual([
          "Hétero",
          "Demi",
        ])
      })

      it("should return error for invalid orientation", () => {
        const result = mapToArray("Invalid", "orientation")
        expect(result).toEqual({
          error: true,
          value: "Invalid",
          validOptions: expect.any(Array),
        })
      })
    })

    describe("pronouns validation", () => {
      it("should wrap single valid pronoun in array", () => {
        expect(mapToArray("Ela/dela", "pronouns")).toEqual(["Ela/dela"])
      })

      it("should normalize case variations", () => {
        expect(mapToArray("Ele/Dele", "pronouns")).toEqual(["Ele/dele"])
      })

      it("should handle multiple pronouns", () => {
        expect(mapToArray("Ela/dela, Elu/delu", "pronouns")).toEqual([
          "Ela/dela",
          "Elu/delu",
        ])
      })
    })
  })

  describe("parseBoolean", () => {
    it("should return true for TRUE", () => {
      expect(parseBoolean("TRUE")).toBe(true)
    })

    it("should return false for FALSE", () => {
      expect(parseBoolean("FALSE")).toBe(false)
    })

    it("should return null for empty string", () => {
      expect(parseBoolean("")).toBeNull()
    })

    it("should return null for whitespace only", () => {
      expect(parseBoolean("   ")).toBeNull()
    })

    it("should handle case insensitively", () => {
      expect(parseBoolean("true")).toBe(true)
      expect(parseBoolean("false")).toBe(false)
    })

    it("should trim whitespace", () => {
      expect(parseBoolean("  TRUE  ")).toBe(true)
    })

    it("should return null for other values", () => {
      expect(parseBoolean("maybe")).toBeNull()
      expect(parseBoolean("yes")).toBeNull()
      expect(parseBoolean("no")).toBeNull()
    })
  })

  describe("normalizeName", () => {
    it("should convert to title case", () => {
      expect(normalizeName("john doe")).toBe("John Doe")
    })

    it("should handle all caps", () => {
      expect(normalizeName("JOHN DOE")).toBe("John Doe")
    })

    it("should handle mixed case", () => {
      expect(normalizeName("jOHN dOE")).toBe("John Doe")
    })

    it("should trim whitespace", () => {
      expect(normalizeName("  John Doe  ")).toBe("John Doe")
    })

    it("should handle empty string", () => {
      expect(normalizeName("")).toBe("")
    })

    it("should handle names with accents", () => {
      expect(normalizeName("joão silva")).toBe("João Silva")
    })

    it("should keep Portuguese particles in lowercase", () => {
      expect(normalizeName("maria da silva")).toBe("Maria da Silva")
      expect(normalizeName("JOSÉ DE ALMEIDA")).toBe("José de Almeida")
      expect(normalizeName("ana dos santos")).toBe("Ana dos Santos")
      expect(normalizeName("carlos das neves")).toBe("Carlos das Neves")
      expect(normalizeName("pedro do nascimento")).toBe("Pedro do Nascimento")
    })

    it("should capitalize particle if it is the first word", () => {
      expect(normalizeName("da silva")).toBe("Da Silva")
    })
  })

  describe("parseMailingRow", () => {
    const EVENT_COLUMNS = ["04/02/23", "01/07/23"]

    it("should parse a valid complete row", () => {
      const row = {
        Nome: "João Silva",
        "Nome social": "Jota",
        Gênero: "Homem cis",
        Orientação: "Bi",
        Pronomes: "Ele/dele",
        "E-mail": "joao@example.com",
        Celular: "(11) 99999-9999",
        RG: "12345678",
        Bandeira: "",
        "Aprovade para futuras festas?": "TRUE",
        Observação: "Some notes",
        "04/02/23": "TRUE",
        "01/07/23": "FALSE",
      }

      const result = parseMailingRow(row, 1, EVENT_COLUMNS)

      expect(result.record).toEqual({
        _rowIndex: 1,
        full_name: "João Silva",
        social_name: "Jota",
        gender: ["Homem cis"],
        orientation: ["Bi"],
        pronouns: ["Ele/dele"],
        email: "joao@example.com",
        phone: 11999999999,
        rg: "12345678",
        flag: "none",
        approved_to_attend: "approved",
        general_notes: "Some notes",
        events: {
          "04/02/23": true,
          "01/07/23": false,
        },
      })
      expect(result.errors).toHaveLength(0)
    })

    it("should handle row with minimal data", () => {
      const row = {
        Nome: "maria",
        "Nome social": "",
        Gênero: "",
        Orientação: "",
        Pronomes: "",
        "E-mail": "maria@example.com",
        Celular: "",
        RG: "",
        Bandeira: "",
        "Aprovade para futuras festas?": "",
        Observação: "",
        "04/02/23": "",
        "01/07/23": "",
      }

      const result = parseMailingRow(row, 2, EVENT_COLUMNS)

      expect(result.record).toEqual({
        _rowIndex: 2,
        full_name: "Maria",
        social_name: null,
        gender: null,
        orientation: null,
        pronouns: null,
        email: "maria@example.com",
        phone: null,
        rg: null,
        flag: "none",
        approved_to_attend: "pending",
        general_notes: null,
        events: {
          "04/02/23": null,
          "01/07/23": null,
        },
      })
      expect(result.errors).toHaveLength(0)
    })

    it("should collect errors for invalid fields", () => {
      const row = {
        Nome: "Test",
        "Nome social": "",
        Gênero: "Invalid Gender",
        Orientação: "",
        Pronomes: "",
        "E-mail": "invalid-email",
        Celular: "",
        RG: "",
        Bandeira: "",
        "Aprovade para futuras festas?": "",
        Observação: "",
        "04/02/23": "",
        "01/07/23": "",
      }

      const result = parseMailingRow(row, 3, EVENT_COLUMNS)

      expect(result.errors).toHaveLength(2)
      expect(result.errors).toContainEqual({
        rowIndex: 3,
        field: "email",
        message: "Invalid email format",
        value: "invalid-email",
      })
      expect(result.errors).toContainEqual({
        rowIndex: 3,
        field: "gender",
        message: "Invalid value",
        value: "Invalid Gender",
      })
    })

    it("should handle red flag overriding approval", () => {
      const row = {
        Nome: "Test User",
        "Nome social": "",
        Gênero: "",
        Orientação: "",
        Pronomes: "",
        "E-mail": "test@example.com",
        Celular: "",
        RG: "",
        Bandeira: "🚨",
        "Aprovade para futuras festas?": "TRUE",
        Observação: "",
        "04/02/23": "",
        "01/07/23": "",
      }

      const result = parseMailingRow(row, 4, EVENT_COLUMNS)

      expect(result.record?.flag).toBe("red")
      expect(result.record?.approved_to_attend).toBe("rejected")
    })
  })
})
