import type { SupabaseClient } from "@supabase/supabase-js"
import { changePasswordValidation } from "~/copy/account"
import { registerCopy } from "~/copy/auth"
import { zod } from "~/lib/helpers/zod"
import type { Database } from "~types/database/database.types"

/* AUTH */

export const loginSchema = zod.object({
  email: zod.string().min(1).email(),
  password: zod.string().min(1),
})

export const forgotPasswordSchema = zod.object({
  email: zod.string().min(1).email(),
})

export const currentUserSchema = zod.object({
  id: zod.string(),
  email: zod.string().optional(),
})

export const changePasswordFieldsSchema = zod.object({
  password: zod.string().min(6),
  confirm_password: zod.string(),
})

export const changePasswordSchema = changePasswordFieldsSchema
  .refine((data) => data.password === data.confirm_password, {
    message: changePasswordValidation.passwordMismatch,
    path: ["confirm_password"],
  })

export const registerUserFieldsSchema = zod.object({
  email: zod.string().email(),
  password: zod.string().min(8),
  // Required in its own right, so that a field nobody filled in is reported as
  // missing rather than as disagreeing with a password it was never compared to.
  confirmPassword: zod.string().min(1),
  // A box nobody ticked may arrive as false or not arrive at all. Reading the
  // second as the first is what lets the refine's own message through, instead
  // of zod refusing it as missing before ever reaching the rule.
  over18: zod.preprocess(
    (value) => value ?? false,
    zod.boolean().refine((val) => val, {
      message: registerCopy.validation.over18,
    }),
  ),
  captchaToken: zod.string().min(1, registerCopy.validation.captcha),
})

/** Shared so the browser and the server say the same thing about it. */
export const PASSWORDS_DIFFER_MESSAGE = registerCopy.validation.passwordMismatch

export const registerUserSchema = registerUserFieldsSchema.refine(
  (data) => data.password === data.confirmPassword,
  {
    message: PASSWORDS_DIFFER_MESSAGE,
    path: ["confirmPassword"],
  },
)

export const currentProfileSchema = zod.object({
  id: zod.string(),
  email: zod.string().nullish(),
  full_name: zod.string().nullish(),
  basic_data_filled: zod.boolean(),
  social_name: zod.string().nullish(),
  pronouns: zod.array(zod.string()).nullish(),
  rg: zod.string().nullish(),
  cpf: zod.string().nullish(),
  cpf_exempt: zod.boolean().nullish(),
  phone: zod.number().nullish(),
  phone_is_international: zod.boolean().nullish(),
  date_of_birth: zod.string().nullish(),
  gender: zod.array(zod.string()).nullish(),
  orientation: zod.array(zod.string()).nullish(),
  race_color: zod.array(zod.string()).nullish(),
  where_lives: zod.string().nullish(),
  how_came_to_us: zod.string().nullish(),
  rg_issuer: zod.string().nullish(),
  created_at: zod.string(),
  roles: zod.array(zod.string()).nullish(),
  permissions: zod.array(zod.string()).nullish(),
})

export const getSupabaseSchema = zod.object({
  supabase: zod.custom<SupabaseClient<Database, "public">>(),
  supabaseHeaders: zod.custom<Headers>(),
})

export const contextSchema = getSupabaseSchema.extend({
  currentUser: currentUserSchema.nullable(),
  currentProfile: currentProfileSchema.nullable(),
  isProdInDev: zod.boolean().optional(),
  host: zod.string().nullable(),
})

export const userContextSchema = contextSchema.extend({
  currentUser: currentUserSchema,
})
