import { describe, expect, it } from "vitest"
import { validationMessages } from "~/lib/helpers/validation-messages"
import {
  applyToEventSchema,
  basicDataFieldsSchema,
  basicDataSchema,
  ExtraBasicDataSchema,
  registerUserFieldsSchema,
  registerUserSchema,
} from "./common"

describe("applyToEventSchema", () => {
  describe("referred field validation", () => {
    it("should reject empty strings", () => {
      const data = {
        applicationDate: new Date(),
        eventId: "test-event-id",
        referred: "",
        bond: "Posso ir sozinhe.",
      }

      const result = applyToEventSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        const referredError = result.error.issues.find(
          (issue) => issue.path[0] === "referred",
        )
        expect(referredError).toBeDefined()
        expect(referredError?.message).toBe("Campo obrigatório")
      }
    })

    it("should reject whitespace-only strings", () => {
      const data = {
        applicationDate: new Date(),
        eventId: "test-event-id",
        referred: "   ",
        bond: "Posso ir sozinhe.",
      }

      const result = applyToEventSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        const referredError = result.error.issues.find(
          (issue) => issue.path[0] === "referred",
        )
        expect(referredError).toBeDefined()
        expect(referredError?.message).toBe("Campo obrigatório")
      }
    })

    it("should accept 'ninguém' as valid input", () => {
      const data = {
        applicationDate: new Date(),
        eventId: "test-event-id",
        referred: "ninguém",
        bond: "Posso ir sozinhe.",
      }

      const result = applyToEventSchema.safeParse(data)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.referred).toBe("ninguém")
      }
    })

    it("should accept actual referral names", () => {
      const data = {
        applicationDate: new Date(),
        eventId: "test-event-id",
        referred: "João Silva - indicação formal",
        bond: "Posso ir sozinhe.",
      }

      const result = applyToEventSchema.safeParse(data)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.referred).toBe("João Silva - indicação formal")
      }
    })

    it("should trim whitespace from the input", () => {
      const data = {
        applicationDate: new Date(),
        eventId: "test-event-id",
        referred: "  ninguém  ",
        bond: "Posso ir sozinhe.",
      }

      const result = applyToEventSchema.safeParse(data)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.referred).toBe("ninguém")
      }
    })
  })

  describe("complete schema validation", () => {
    it("should accept valid complete data", () => {
      const data = {
        applicationDate: new Date(),
        eventId: "test-event-id",
        referrals: "Some referral info",
        referred: "Maria Santos",
        companions: "João and Pedro",
        bond: "Só vou acompanhade.",
        notes: "Looking forward to the event",
      }

      const result = applyToEventSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it("should accept minimal valid data", () => {
      const data = {
        applicationDate: new Date(),
        eventId: "test-event-id",
        referred: "ninguém",
      }

      const result = applyToEventSchema.safeParse(data)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.bond).toBe("Posso ir sozinhe.") // Check default value
      }
    })

    it("should reject data without required fields", () => {
      const data = {
        applicationDate: new Date(),
        eventId: "test-event-id",
        // Missing referred field
      }

      const result = applyToEventSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })
})

describe("registerUserSchema", () => {
  const validData = {
    email: "test@example.com",
    password: "password123",
    confirmPassword: "password123",
    over18: true,
    captchaToken: "valid-token",
  }

  describe("captchaToken field validation", () => {
    it("should require captchaToken field", () => {
      const data = {
        email: "test@example.com",
        password: "password123",
        confirmPassword: "password123",
        over18: true,
        // Missing captchaToken
      }

      const result = registerUserSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        const captchaError = result.error.issues.find(
          (issue) => issue.path[0] === "captchaToken",
        )
        expect(captchaError).toBeDefined()
      }
    })

    it("should reject empty captchaToken", () => {
      const data = {
        ...validData,
        captchaToken: "",
      }

      const result = registerUserSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        const captchaError = result.error.issues.find(
          (issue) => issue.path[0] === "captchaToken",
        )
        expect(captchaError).toBeDefined()
        expect(captchaError?.message).toBe(
          "Por favor, complete a verificação de segurança",
        )
      }
    })

    it("should accept valid captchaToken", () => {
      const result = registerUserSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.captchaToken).toBe("valid-token")
      }
    })
  })
})

describe("registerUserFieldsSchema", () => {
  it("exposes each field so a question can reuse it", () => {
    expect(
      registerUserFieldsSchema.shape.email.safeParse("nao-e-email").success,
    ).toBe(false)
    expect(
      registerUserFieldsSchema.shape.email.safeParse("a@b.com").success,
    ).toBe(true)
    expect(
      registerUserFieldsSchema.shape.password.safeParse("curta").success,
    ).toBe(false)
  })

  it("does not check that the passwords match — that is the whole schema's job", () => {
    const values = {
      email: "a@b.com",
      password: "segredo123",
      confirmPassword: "outra",
      over18: true,
      captchaToken: "token",
    }

    expect(registerUserFieldsSchema.safeParse(values).success).toBe(true)
    expect(registerUserSchema.safeParse(values).success).toBe(false)
  })
})

describe("basicDataFieldsSchema", () => {
  it("exposes each field so a question can reuse it", () => {
    const { shape } = basicDataFieldsSchema

    expect(shape.full_name.safeParse("M").success).toBe(false)
    expect(shape.full_name.safeParse("Maria Silva").success).toBe(true)
    expect(shape.phone.safeParse(1).success).toBe(false)
    expect(shape.phone.safeParse(11999999999).success).toBe(true)
    expect(shape.date_of_birth.safeParse("2020-01-01").success).toBe(false)
  })

  it("does not compare one field with another — that is the whole schema's job", () => {
    const mismatched = {
      full_name: "Maria Silva",
      social_name: null,
      rg: "123456789",
      rg_issuer: "SSP-SP",
      cpf: "12345678900",
      date_of_birth: "1990-01-01",
      phone: 11999999999,
      confirm_phone: 11888888888,
    }

    expect(basicDataFieldsSchema.safeParse(mismatched).success).toBe(true)
    expect(basicDataSchema.safeParse(mismatched).success).toBe(false)
  })
})

describe("basicDataSchema", () => {
  const validBasicData = {
    full_name: "Maria Silva",
    social_name: null,
    rg: "123456789",
    rg_issuer: "SSP-SP",
    cpf: "12345678900",
    date_of_birth: "1990-01-01",
    phone: 11999999999,
    confirm_phone: 11999999999,
  }

  describe("name transformation", () => {
    it("should transform all uppercase full_name to title case", () => {
      const data = { ...validBasicData, full_name: "MARIA SILVA" }
      const result = basicDataSchema.safeParse(data)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.full_name).toBe("Maria Silva")
      }
    })

    it("should transform all lowercase full_name to title case", () => {
      const data = { ...validBasicData, full_name: "maria silva" }
      const result = basicDataSchema.safeParse(data)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.full_name).toBe("Maria Silva")
      }
    })

    it("should transform all uppercase social_name to title case", () => {
      const data = { ...validBasicData, social_name: "MARIA" }
      const result = basicDataSchema.safeParse(data)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.social_name).toBe("Maria")
      }
    })

    it("should transform all lowercase social_name to title case", () => {
      const data = { ...validBasicData, social_name: "maria" }
      const result = basicDataSchema.safeParse(data)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.social_name).toBe("Maria")
      }
    })

    it("should leave properly cased name unchanged", () => {
      const data = { ...validBasicData, full_name: "Maria da Silva" }
      const result = basicDataSchema.safeParse(data)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.full_name).toBe("Maria da Silva")
      }
    })

    it("should handle Portuguese particles correctly", () => {
      const data = { ...validBasicData, full_name: "JOÃO DOS SANTOS" }
      const result = basicDataSchema.safeParse(data)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.full_name).toBe("João dos Santos")
      }
    })
  })

  describe("social_name !== full_name validation", () => {
    it("should fail when social_name equals full_name exactly", () => {
      const data = {
        ...validBasicData,
        full_name: "Maria Silva",
        social_name: "Maria Silva",
      }
      const result = basicDataSchema.safeParse(data)

      expect(result.success).toBe(false)
      if (!result.success) {
        const socialNameError = result.error.issues.find((issue) =>
          issue.path.includes("social_name"),
        )
        expect(socialNameError).toBeDefined()
        expect(socialNameError?.message).toBe(
          "O nome social deve ser diferente do nome completo",
        )
      }
    })

    it("should fail when social_name equals full_name case-insensitively", () => {
      const data = {
        ...validBasicData,
        full_name: "Maria Silva",
        social_name: "maria silva",
      }
      const result = basicDataSchema.safeParse(data)

      expect(result.success).toBe(false)
      if (!result.success) {
        const socialNameError = result.error.issues.find((issue) =>
          issue.path.includes("social_name"),
        )
        expect(socialNameError).toBeDefined()
      }
    })

    it("should fail when social_name equals full_name after transformation", () => {
      const data = {
        ...validBasicData,
        full_name: "MARIA SILVA",
        social_name: "maria silva",
      }
      const result = basicDataSchema.safeParse(data)

      expect(result.success).toBe(false)
    })

    it("should pass when social_name is different from full_name", () => {
      const data = {
        ...validBasicData,
        full_name: "Maria Silva",
        social_name: "Maria",
      }
      const result = basicDataSchema.safeParse(data)

      expect(result.success).toBe(true)
    })

    it("should pass when social_name is null", () => {
      const data = {
        ...validBasicData,
        full_name: "Maria Silva",
        social_name: null,
      }
      const result = basicDataSchema.safeParse(data)

      expect(result.success).toBe(true)
    })

    it("should pass when social_name is undefined", () => {
      const data = {
        ...validBasicData,
        full_name: "Maria Silva",
      }
      delete (data as { social_name?: string | null }).social_name
      const result = basicDataSchema.safeParse(data)

      expect(result.success).toBe(true)
    })
  })
})
describe("ExtraBasicDataSchema", () => {
  const validExtraData = {
    gender: ["Travesti"],
    orientation: ["Bi"],
    pronouns: ["Ela/dela"],
    race_color: ["Preta"],
  }

  it("accepts an answer someone wrote themselves", () => {
    const result = ExtraBasicDataSchema.safeParse({
      ...validExtraData,
      gender: ["Pessoa não binária transmasculina"],
    })

    expect(result.success).toBe(true)
  })

  it.each(["gender", "orientation", "pronouns", "race_color"])(
    "refuses a %s answer longer than fifty characters",
    (field) => {
      const result = ExtraBasicDataSchema.safeParse({
        ...validExtraData,
        [field]: ["a".repeat(51)],
      })

      expect(result.success).toBe(false)
      if (result.success) throw new Error("expected a refusal")
      expect(result.error.issues[0].message).toBe(validationMessages.maxLength(50))
    },
  )

  it.each(["gender", "orientation", "pronouns", "race_color"])(
    "refuses more than ten %s answers",
    (field) => {
      const result = ExtraBasicDataSchema.safeParse({
        ...validExtraData,
        [field]: Array.from({ length: 11 }, (_, index) => `answer ${index}`),
      })

      expect(result.success).toBe(false)
      if (result.success) throw new Error("expected a refusal")
      expect(result.error.issues[0].message).toBe(validationMessages.maxOptions(10))
    },
  )
})
