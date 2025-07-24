// Re-export authentication and user-related schemas
export {
  loginSchema,
  forgotPasswordSchema,
  currentUserSchema,
  currentProfileSchema,
  getSupabaseSchema,
  agreeToTermsSchema,
  genderPronounOrientationSchema,
  applyToEventSchema,
} from "~/business/common"

export { clientContextSchema } from "~/business/auth/auth.client"