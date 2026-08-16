import { describe, expect, it } from "vitest"
import { zod } from "./zod"

const firstMessage = (result: { error?: { issues: { message: string }[] } }) =>
  result.error?.issues[0].message

describe("zod default messages", () => {
  describe("missing value", () => {
    it("should say the field is required when a key is absent from an object", () => {
      const schema = zod.object({ name: zod.string() })

      const result = schema.safeParse({})

      expect(firstMessage(result)).toBe("Campo obrigatório")
    })

    it("should say the field is required when the value is undefined", () => {
      const result = zod.string().safeParse(undefined)

      expect(firstMessage(result)).toBe("Campo obrigatório")
    })

    it("should say the field is required when the value is null", () => {
      const result = zod.string().safeParse(null)

      expect(firstMessage(result)).toBe("Campo obrigatório")
    })

    it("should say the field is required when a string is empty", () => {
      const result = zod.string().min(1).safeParse("")

      expect(firstMessage(result)).toBe("Campo obrigatório")
    })

    it("should say the field is required when no option is selected", () => {
      const result = zod.array(zod.string()).min(1).safeParse([])

      expect(firstMessage(result)).toBe("Campo obrigatório")
    })
  })

  describe("wrong type", () => {
    it("should not expose the expected or received type", () => {
      const result = zod.string().safeParse(42)

      expect(firstMessage(result)).toBe("Valor inválido")
    })
  })

  describe("too small", () => {
    it("should report the minimum length of a string", () => {
      const result = zod.string().min(2).safeParse("a")

      expect(firstMessage(result)).toBe("No mínimo 2 caracteres")
    })

    it("should report the minimum number of options", () => {
      const result = zod.array(zod.string()).min(2).safeParse(["a"])

      expect(firstMessage(result)).toBe("Selecione ao menos 2 opções")
    })

    it("should report the minimum value of a number", () => {
      const result = zod.number().min(10).safeParse(9)

      expect(firstMessage(result)).toBe("O valor mínimo é 10")
    })
  })

  describe("too big", () => {
    it("should report the maximum length of a string", () => {
      const result = zod.string().max(5).safeParse("abcdef")

      expect(firstMessage(result)).toBe("No máximo 5 caracteres")
    })

    it("should report the maximum number of options", () => {
      const result = zod.array(zod.string()).max(2).safeParse(["a", "b", "c"])

      expect(firstMessage(result)).toBe("Selecione no máximo 2 opções")
    })

    it("should report the maximum value of a number", () => {
      const result = zod.number().max(10).safeParse(11)

      expect(firstMessage(result)).toBe("O valor máximo é 10")
    })
  })

  describe("invalid format", () => {
    it("should report an invalid e-mail", () => {
      const result = zod.string().email().safeParse("not-an-email")

      expect(firstMessage(result)).toBe("E-mail inválido")
    })

    it("should report an invalid datetime", () => {
      const result = zod.string().datetime().safeParse("2026-13-45")

      expect(firstMessage(result)).toBe("Data inválida")
    })

    it("should fall back to a generic format message", () => {
      const result = zod.string().url().safeParse("nope")

      expect(firstMessage(result)).toBe("Formato inválido")
    })
  })

  describe("codes without a message of their own", () => {
    it("should report a failed refine without a message", () => {
      const result = zod
        .string()
        .refine((value) => value === "ok")
        .safeParse("no")

      expect(firstMessage(result)).toBe("Valor inválido")
    })

    it("should report an unrecognized key", () => {
      const result = zod
        .strictObject({ name: zod.string() })
        .safeParse({ name: "a", extra: true })

      expect(firstMessage(result)).toBe("Valor inválido")
    })

    it("should report a value outside an enum", () => {
      const result = zod.enum(["a", "b"]).safeParse("c")

      expect(firstMessage(result)).toBe("Valor inválido")
    })
  })

  describe("technical vocabulary", () => {
    const technicalTerms = [
      "Esperado",
      "Recebido",
      "Expected",
      "Invalid",
      "undefined",
      "string",
    ]

    const results = [
      zod.object({ name: zod.string() }).safeParse({}),
      zod.string().safeParse(42),
      zod.string().min(2).safeParse("a"),
      zod.string().max(1).safeParse("ab"),
      zod.string().email().safeParse("nope"),
      zod.enum(["a"]).safeParse("b"),
      zod.strictObject({ a: zod.string() }).safeParse({ a: "a", b: 1 }),
      zod
        .string()
        .refine(() => false)
        .safeParse("a"),
    ]

    it("should never leak a type name or zod wording to the interface", () => {
      const messages = results.flatMap(
        (result) => result.error?.issues.map((issue) => issue.message) ?? [],
      )

      expect(messages).not.toHaveLength(0)
      for (const message of messages) {
        for (const term of technicalTerms) {
          expect(message).not.toContain(term)
        }
      }
    })
  })

  describe("explicit messages", () => {
    it("should keep a message written in the schema", () => {
      const result = zod
        .string()
        .min(1, { message: "Escolha uma cidade" })
        .safeParse("")

      expect(firstMessage(result)).toBe("Escolha uma cidade")
    })
  })
})
