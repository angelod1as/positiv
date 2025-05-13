import type { SupabaseClient } from "@supabase/supabase-js"
import { PHONE_REGEXP } from "~/lib/helpers/constants"
import { zod } from "~/lib/helpers/zod"
import type { Database } from "~types/database.types"

/* AUTH */

export const loginSchema = zod.object({
  email: zod
    .string()
    .min(1, "Insira pelo menos um caracter")
    .email("E-mail inválido"),
  password: zod.string().min(1, "Insira pelo menos um caracter"),
})

export const forgotPasswordSchema = zod.object({
  email: zod
    .string()
    .min(1, "Insira pelo menos um caracter")
    .email("E-mail inválido"),
})

export const currentUserSchema = zod.object({
  id: zod.string(),
})

export const changePasswordSchema = zod
  .object({
    password: zod
      .string()
      .min(6, "A senha precisa ter, no mínimo, 6 caracteres"),
    confirm_password: zod.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "As senhas não combinam",
    path: ["confirm_password"],
  })

export const currentProfileSchema = zod.object({
  id: zod.string(),
  email: zod.string().nullish(),
  full_name: zod.string().nullish(),
  basic_data_filled: zod.boolean(),
  social_name: zod.string().nullish(),
  pronouns: zod.array(zod.string()).nullish(),
  rg: zod.string().nullish(),
  cpf: zod.string().nullish(),
  phone: zod.number().nullish(),
  date_of_birth: zod.string().nullish(),
  gender: zod.array(zod.string()).nullish(),
  orientation: zod.array(zod.string()).nullish(),
  where_lives: zod.string().nullish(),
  how_came_to_us: zod.string().nullish(),
  rg_issuer: zod.string().nullish(),
  allow_marketing_email: zod.boolean().nullish(),
  created_at: zod.string(),
  is_admin: zod.boolean(),
})

export const contextSchema = zod.object({
  supabase: zod.custom<SupabaseClient<Database, "public">>(),
  supabaseHeaders: zod.custom<Headers>(),
  currentUser: currentUserSchema.nullable(),
  currentProfile: currentProfileSchema.nullable(),
  isProd: zod.boolean().optional(),
  host: zod.string().nullable(),
})

export const userContextSchema = contextSchema.extend({
  currentUser: currentUserSchema,
})

/* DASHBOARD */

export const agreeToTermsSchema = zod.object({
  agree: zod.boolean().refine((val) => val, {
    message: "Você só pode continuar se estiver de acordo.",
  }),
  commonEmails: zod.boolean().refine((val) => val, {
    message:
      "Nosso sistema só funciona se você aceitar receber e-mails gerais.",
  }),
  mktEmails: zod.boolean().optional(),
})

/* BASIC DATA */
export const basicDataSchema = zod
  .object({
    full_name: zod.string().min(2).max(255),
    social_name: zod.string().min(2).max(255).optional(),
    rg: zod.string().min(2),
    rg_issuer: zod.string().min(2),
    cpf: zod.string().min(2),
    date_of_birth: zod.string({ message: "Obrigatório" }).pipe(
      zod.coerce.date({
        invalid_type_error: "Data inválida",
        required_error: "Obrigatório",
      }),
    ),
    phone: zod.coerce
      .number({
        invalid_type_error: "Você tem certeza que digitou um número?",
      })
      .refine((value) => PHONE_REGEXP.test(value.toString()), {
        message: "Número inválido",
      }),
    confirm_phone: zod.coerce
      .number({
        invalid_type_error: "Você tem certeza que digitou um número?",
      })
      .refine((value) => PHONE_REGEXP.test(value.toString()), {
        message: "Número inválido",
      }),
    how_came_to_us: zod.string().optional(),
    where_lives: zod.string().optional(),
  })
  .refine((data) => data.phone === data.confirm_phone, {
    message: "Os números de telefone são diferentes",
    path: ["phone"],
  })

export const genderPronounOrientationSchema = zod.object({
  gender: zod
    .array(zod.string())
    .refine((value) => value.some((item) => item), {
      message: "Você precisa escolher pelo menos um",
    }),
  orientation: zod
    .array(zod.string())
    .refine((value) => value.some((item) => item), {
      message: "Você precisa escolher pelo menos um",
    }),
  pronouns: zod
    .array(zod.string())
    .refine((value) => value.some((item) => item), {
      message: "Você precisa escolher pelo menos um",
    }),
})
