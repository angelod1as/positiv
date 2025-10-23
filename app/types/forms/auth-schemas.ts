// Re-export authentication and user-related schemas
export {
  ExtraBasicDataSchema,
  agreeToTermsSchema,
  applyToEventSchema,
  currentProfileSchema,
  currentUserSchema,
  forgotPasswordSchema,
  getSupabaseSchema,
  loginSchema,
} from "~/business/common"

export { clientContextSchema } from "~/business/auth/auth.client"
