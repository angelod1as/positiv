import { describe, expect, it } from "vitest"
import { toTitleCase, needsTitleCase, normalizeName } from "./strings"

describe("toTitleCase", () => {
  describe("basic conversion", () => {
    it("should convert all uppercase to title case", () => {
      expect(toTitleCase("MARIA SILVA")).toBe("Maria Silva")
    })

    it("should convert all lowercase to title case", () => {
      expect(toTitleCase("maria silva")).toBe("Maria Silva")
    })

    it("should handle single word", () => {
      expect(toTitleCase("MARIA")).toBe("Maria")
    })
  })

  describe("Portuguese particles", () => {
    it("should keep 'da' lowercase when not first word", () => {
      expect(toTitleCase("MARIA DA SILVA")).toBe("Maria da Silva")
    })

    it("should keep 'de' lowercase when not first word", () => {
      expect(toTitleCase("JOSE DE SOUZA")).toBe("Jose de Souza")
    })

    it("should keep 'do' lowercase when not first word", () => {
      expect(toTitleCase("ANA DO CARMO")).toBe("Ana do Carmo")
    })

    it("should keep 'das' lowercase when not first word", () => {
      expect(toTitleCase("PEDRO DAS NEVES")).toBe("Pedro das Neves")
    })

    it("should keep 'dos' lowercase when not first word", () => {
      expect(toTitleCase("JOAO DOS SANTOS")).toBe("Joao dos Santos")
    })

    it("should keep 'e' lowercase when not first word", () => {
      expect(toTitleCase("MARIA E SILVA")).toBe("Maria e Silva")
    })

    it("should capitalize particle when it is the first word", () => {
      expect(toTitleCase("DA SILVA")).toBe("Da Silva")
    })
  })

  describe("accented characters", () => {
    it("should handle accented uppercase characters", () => {
      expect(toTitleCase("JOÃO DOS SANTOS")).toBe("João dos Santos")
    })

    it("should handle accented lowercase characters", () => {
      expect(toTitleCase("joão dos santos")).toBe("João dos Santos")
    })

    it("should handle multiple accents", () => {
      expect(toTitleCase("JOSÉ ANTÔNIO")).toBe("José Antônio")
    })
  })

  describe("edge cases", () => {
    it("should handle empty string", () => {
      expect(toTitleCase("")).toBe("")
    })

    it("should handle single character", () => {
      expect(toTitleCase("A")).toBe("A")
    })

    it("should handle extra spaces", () => {
      expect(toTitleCase("MARIA  SILVA")).toBe("Maria  Silva")
    })
  })
})

describe("needsTitleCase", () => {
  describe("all uppercase detection", () => {
    it("should return true for all uppercase name", () => {
      expect(needsTitleCase("MARIA SILVA")).toBe(true)
    })

    it("should return true for all uppercase with accents", () => {
      expect(needsTitleCase("JOÃO DOS SANTOS")).toBe(true)
    })
  })

  describe("all lowercase detection", () => {
    it("should return true for all lowercase name", () => {
      expect(needsTitleCase("maria silva")).toBe(true)
    })

    it("should return true for all lowercase with accents", () => {
      expect(needsTitleCase("joão dos santos")).toBe(true)
    })
  })

  describe("proper case detection", () => {
    it("should return false for title case name", () => {
      expect(needsTitleCase("Maria Silva")).toBe(false)
    })

    it("should return false for name with particles", () => {
      expect(needsTitleCase("Maria da Silva")).toBe(false)
    })

    it("should return false for mixed case name", () => {
      expect(needsTitleCase("João dos Santos")).toBe(false)
    })
  })

  describe("edge cases", () => {
    it("should return false for single character", () => {
      expect(needsTitleCase("A")).toBe(false)
    })

    it("should return false for empty string", () => {
      expect(needsTitleCase("")).toBe(false)
    })

    it("should return false for numbers only", () => {
      expect(needsTitleCase("12345")).toBe(false)
    })
  })
})

describe("normalizeName", () => {
  describe("conversion behavior", () => {
    it("should convert all uppercase to title case", () => {
      expect(normalizeName("MARIA SILVA")).toBe("Maria Silva")
    })

    it("should convert all lowercase to title case", () => {
      expect(normalizeName("maria silva")).toBe("Maria Silva")
    })

    it("should leave proper case unchanged", () => {
      expect(normalizeName("Maria Silva")).toBe("Maria Silva")
    })

    it("should leave mixed case with particles unchanged", () => {
      expect(normalizeName("Maria da Silva")).toBe("Maria da Silva")
    })
  })

  describe("Portuguese names", () => {
    it("should handle all caps with particles", () => {
      expect(normalizeName("JOÃO DOS SANTOS")).toBe("João dos Santos")
    })

    it("should handle all lowercase with particles", () => {
      expect(normalizeName("joão dos santos")).toBe("João dos Santos")
    })
  })

  describe("edge cases", () => {
    it("should handle empty string", () => {
      expect(normalizeName("")).toBe("")
    })

    it("should handle single character", () => {
      expect(normalizeName("A")).toBe("A")
    })
  })
})
