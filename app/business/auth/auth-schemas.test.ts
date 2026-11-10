import { describe, expect, it } from "vitest"
import {
  currentProfileSchema,
  registerUserFieldsSchema,
  registerUserSchema,
} from "./auth-schemas"

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

describe("currentProfileSchema", () => {
  const profile = {
    id: "profile-1",
    basic_data_filled: true,
    created_at: "2026-10-21T00:00:00Z",
    roles: ["admin"],
    permissions: ["admin.panel"],
  }

  it("accepts a profile that carries only roles and permissions", () => {
    expect(currentProfileSchema.safeParse(profile).success).toBe(true)
  })

  it("drops an is_admin flag, so nothing can gate on it", () => {
    const parsed = currentProfileSchema.parse({ ...profile, is_admin: true })

    expect(parsed).not.toHaveProperty("is_admin")
  })
})
