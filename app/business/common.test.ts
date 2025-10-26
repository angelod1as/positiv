import { describe, expect, it } from "vitest"
import { applyToEventSchema, registerUserSchema } from "./common"

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