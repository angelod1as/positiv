import { describe, expect, it } from "vitest"
import {
  applyToEventSchema,
  basicDataSchema,
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
        expect(referredError?.message).toBe("Este campo é obrigatório")
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
        expect(referredError?.message).toBe("Este campo é obrigatório")
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