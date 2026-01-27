import { describe, expect, it } from "vitest"
import { feedbackFormSchema } from "./feedback-schema"

describe("feedbackFormSchema", () => {
  const validData = {
    name: "João Silva",
    email: "joao@example.com",
    whatsapp: "11999999999",
    hasParticipated: "never" as const,
    feedbackText: "Este é um feedback com pelo menos 10 caracteres.",
    captchaToken: "valid-captcha-token",
  }

  describe("minimal required data validation", () => {
    it("should accept minimal valid data (only required fields)", () => {
      const data = {
        hasParticipated: "never" as const,
        feedbackText: "Este é um feedback válido.",
        captchaToken: "valid-captcha-token",
      }

      const result = feedbackFormSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it("should accept complete valid data", () => {
      const result = feedbackFormSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe("João Silva")
        expect(result.data.email).toBe("joao@example.com")
      }
    })
  })

  describe("feedbackText field validation", () => {
    it("should reject feedbackText with less than 10 characters", () => {
      const data = {
        ...validData,
        feedbackText: "Curto",
      }

      const result = feedbackFormSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        const feedbackError = result.error.issues.find(
          (issue) => issue.path[0] === "feedbackText",
        )
        expect(feedbackError).toBeDefined()
        expect(feedbackError?.message).toBe(
          "O feedback deve ter pelo menos 10 caracteres",
        )
      }
    })

    it("should accept feedbackText with exactly 10 characters", () => {
      const data = {
        ...validData,
        feedbackText: "1234567890",
      }

      const result = feedbackFormSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })

  describe("email field validation", () => {
    it("should reject invalid email", () => {
      const data = {
        ...validData,
        email: "invalid-email",
      }

      const result = feedbackFormSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        const emailError = result.error.issues.find(
          (issue) => issue.path[0] === "email",
        )
        expect(emailError).toBeDefined()
        expect(emailError?.message).toBe("Insira um e-mail válido")
      }
    })

    it("should accept empty string for email (optional field)", () => {
      const data = {
        ...validData,
        email: "",
      }

      const result = feedbackFormSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it("should accept undefined for email (optional field)", () => {
      const { email: _, ...dataWithoutEmail } = validData

      const result = feedbackFormSchema.safeParse(dataWithoutEmail)
      expect(result.success).toBe(true)
    })
  })

  describe("hasParticipated field validation", () => {
    it("should accept 'never' as valid value", () => {
      const data = { ...validData, hasParticipated: "never" as const }
      const result = feedbackFormSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it("should accept 'once' as valid value", () => {
      const data = { ...validData, hasParticipated: "once" as const }
      const result = feedbackFormSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it("should accept 'more_than_once' as valid value", () => {
      const data = { ...validData, hasParticipated: "more_than_once" as const }
      const result = feedbackFormSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it("should reject invalid participation value", () => {
      const data = { ...validData, hasParticipated: "invalid" }

      const result = feedbackFormSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })

  describe("captchaToken field validation", () => {
    it("should require captchaToken field", () => {
      const { captchaToken: _, ...dataWithoutCaptcha } = validData

      const result = feedbackFormSchema.safeParse(dataWithoutCaptcha)
      expect(result.success).toBe(false)
    })

    it("should reject empty captchaToken", () => {
      const data = {
        ...validData,
        captchaToken: "",
      }

      const result = feedbackFormSchema.safeParse(data)
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
  })

  describe("optional fields", () => {
    it("should accept undefined name", () => {
      const { name: _, ...dataWithoutName } = validData
      const result = feedbackFormSchema.safeParse(dataWithoutName)
      expect(result.success).toBe(true)
    })

    it("should accept undefined whatsapp", () => {
      const { whatsapp: _, ...dataWithoutWhatsapp } = validData
      const result = feedbackFormSchema.safeParse(dataWithoutWhatsapp)
      expect(result.success).toBe(true)
    })
  })
})
