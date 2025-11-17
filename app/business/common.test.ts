import { describe, expect, it } from "vitest"
import {
	applyToEventSchema,
	minimalContextSchema,
	minimalProfileSchema,
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

describe("minimalProfileSchema", () => {
	const validMinimalProfile = {
		id: "550e8400-e29b-41d4-a716-446655440000",
		email: "test@example.com",
		full_name: "Test User",
		social_name: "Testy",
		race_color: ["branco"],
		is_admin: false,
	}

	describe("complete schema validation", () => {
		it("should accept valid minimal profile data with all fields", () => {
			const result = minimalProfileSchema.safeParse(validMinimalProfile)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.id).toBe(validMinimalProfile.id)
				expect(result.data.email).toBe(validMinimalProfile.email)
				expect(result.data.full_name).toBe(validMinimalProfile.full_name)
				expect(result.data.social_name).toBe(validMinimalProfile.social_name)
				expect(result.data.race_color).toEqual(validMinimalProfile.race_color)
				expect(result.data.is_admin).toBe(false)
			}
		})

		it("should accept admin profile with is_admin true", () => {
			const adminProfile = {
				...validMinimalProfile,
				is_admin: true,
			}
			const result = minimalProfileSchema.safeParse(adminProfile)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.is_admin).toBe(true)
			}
		})

		it("should accept profile with nullable social_name", () => {
			const profileWithoutSocialName = {
				...validMinimalProfile,
				social_name: null,
			}
			const result = minimalProfileSchema.safeParse(profileWithoutSocialName)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.social_name).toBeNull()
			}
		})

		it("should accept profile with nullable race_color", () => {
			const profileWithoutRace = {
				...validMinimalProfile,
				race_color: null,
			}
			const result = minimalProfileSchema.safeParse(profileWithoutRace)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.race_color).toBeNull()
			}
		})

		it("should reject profile missing required id field", () => {
			const { id, ...profileWithoutId } = validMinimalProfile
			const result = minimalProfileSchema.safeParse(profileWithoutId)
			expect(result.success).toBe(false)
		})

		it("should reject profile missing required email field", () => {
			const { email, ...profileWithoutEmail } = validMinimalProfile
			const result = minimalProfileSchema.safeParse(profileWithoutEmail)
			expect(result.success).toBe(false)
		})

		it("should reject profile missing required full_name field", () => {
			const { full_name, ...profileWithoutName } = validMinimalProfile
			const result = minimalProfileSchema.safeParse(profileWithoutName)
			expect(result.success).toBe(false)
		})

		it("should reject profile missing required is_admin field", () => {
			const { is_admin, ...profileWithoutAdmin } = validMinimalProfile
			const result = minimalProfileSchema.safeParse(profileWithoutAdmin)
			expect(result.success).toBe(false)
		})

		it("should reject profile with invalid data types", () => {
			const invalidProfile = {
				...validMinimalProfile,
				is_admin: "not a boolean",
			}
			const result = minimalProfileSchema.safeParse(invalidProfile)
			expect(result.success).toBe(false)
		})
	})
})

describe("minimalContextSchema", () => {
	const validMinimalProfile = {
		id: "550e8400-e29b-41d4-a716-446655440000",
		email: "test@example.com",
		full_name: "Test User",
		social_name: "Testy",
		race_color: ["branco"],
		is_admin: false,
	}

	const validCurrentUser = {
		id: "user-123",
		email: "test@example.com",
	}

	describe("context with profile", () => {
		it("should accept valid context with minimal profile and user", () => {
			const context = {
				currentUser: validCurrentUser,
				currentProfile: validMinimalProfile,
				isProdInDev: false,
			}
			const result = minimalContextSchema.safeParse(context)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.currentUser).toEqual(validCurrentUser)
				expect(result.data.currentProfile).toEqual(validMinimalProfile)
				expect(result.data.isProdInDev).toBe(false)
			}
		})

		it("should accept context with null profile and user", () => {
			const context = {
				currentUser: null,
				currentProfile: null,
				isProdInDev: false,
			}
			const result = minimalContextSchema.safeParse(context)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.currentUser).toBeNull()
				expect(result.data.currentProfile).toBeNull()
			}
		})

		it("should accept context without isProdInDev (optional)", () => {
			const context = {
				currentUser: validCurrentUser,
				currentProfile: validMinimalProfile,
			}
			const result = minimalContextSchema.safeParse(context)
			expect(result.success).toBe(true)
		})

		it("should reject context with invalid profile structure", () => {
			const context = {
				currentUser: validCurrentUser,
				currentProfile: {
					id: "550e8400-e29b-41d4-a716-446655440000",
				},
				isProdInDev: false,
			}
			const result = minimalContextSchema.safeParse(context)
			expect(result.success).toBe(false)
		})

		it("should reject context missing currentProfile field", () => {
			const context = {
				currentUser: validCurrentUser,
				isProdInDev: false,
			}
			const result = minimalContextSchema.safeParse(context)
			expect(result.success).toBe(false)
		})

		it("should reject context missing currentUser field", () => {
			const context = {
				currentProfile: validMinimalProfile,
				isProdInDev: false,
			}
			const result = minimalContextSchema.safeParse(context)
			expect(result.success).toBe(false)
		})
	})
})