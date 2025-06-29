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
  email: zod.string().optional(),
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

export const registerUserSchema = zod
  .object({
    email: zod.string().email("Insira um e-mail válido"),
    password: zod.string().min(8, { message: "A senha é muito curta" }),
    confirmPassword: zod.string(),
    over18: zod.boolean().refine((val) => val, {
      message: "Você só pode se inscrever se for maior de 18 anos",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não são iguais",
    path: ["confirmPassword"],
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
    social_name: zod.string().min(2).max(255).nullish(),
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

export const applyToEventSchema = zod.object({
  applicationDate: zod.coerce.date(),
  eventId: zod.string(),
  referrals: zod.string().optional(),
  companions: zod.string().optional(),
  bond: zod
    .enum(["Só vou acompanhade.", "Posso ir sozinhe."])
    .default("Posso ir sozinhe."),
  notes: zod.string().optional(),
})
