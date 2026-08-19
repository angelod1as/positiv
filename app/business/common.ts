import type { SupabaseClient } from "@supabase/supabase-js"
import { PHONE_REGEXP } from "~/lib/constants/constants"
import { normalizeName } from "~/lib/helpers/strings"
import { validationMessages } from "~/lib/helpers/validation-messages"
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

export const changePasswordSchema = zod
  .object({
    password: zod.string().min(6),
    confirm_password: zod.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "As senhas não combinam",
    path: ["confirm_password"],
  })

export const registerUserFieldsSchema = zod.object({
  email: zod.string().email(),
  password: zod.string().min(8),
  confirmPassword: zod.string(),
  // A box nobody ticked may arrive as false or not arrive at all. Reading the
  // second as the first is what lets the refine's own message through, instead
  // of zod refusing it as missing before ever reaching the rule.
  over18: zod.preprocess(
    (value) => value ?? false,
    zod.boolean().refine((val) => val, {
      message: "Você só pode se inscrever se for maior de 18 anos",
    }),
  ),
  captchaToken: zod
    .string()
    .min(1, "Por favor, complete a verificação de segurança"),
})

/** Shared so the browser and the server say the same thing about it. */
export const PASSWORDS_DIFFER_MESSAGE = "As senhas não são iguais"

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
  phone: zod.number().nullish(),
  date_of_birth: zod.string().nullish(),
  gender: zod.array(zod.string()).nullish(),
  orientation: zod.array(zod.string()).nullish(),
  race_color: zod.array(zod.string()).nullish(),
  where_lives: zod.string().nullish(),
  how_came_to_us: zod.string().nullish(),
  rg_issuer: zod.string().nullish(),
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
    full_name: zod.string().min(2).max(255).transform(normalizeName),
    social_name: zod
      .string()
      .min(2)
      .max(255)
      .transform(normalizeName)
      .nullish(),
    rg: zod.string().min(2),
    rg_issuer: zod.string().min(2),
    cpf: zod.string().min(2),
    date_of_birth: zod
      .string()
      .pipe(
        zod.coerce.date({
          error: "Data inválida",
        }),
      )
      .refine(
        (date) => {
          const now = new Date()
          const birthDate = new Date(date)
          let age = now.getFullYear() - birthDate.getFullYear()
          const monthDifference = now.getMonth() - birthDate.getMonth()
          if (
            monthDifference < 0 ||
            (monthDifference === 0 && now.getDate() < birthDate.getDate())
          ) {
            age--
          }
          return age >= 18
        },
        {
          message: "Você precisa ter pelo menos 18 anos",
        },
      ),
    phone: zod.coerce
      .number({
        error: "Você tem certeza que digitou um número?",
      })
      .refine((value) => PHONE_REGEXP.test(value.toString()), {
        message: "Número inválido",
      }),
    confirm_phone: zod.coerce
      .number({
        error: "Você tem certeza que digitou um número?",
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
  .refine(
    (data) => {
      if (!data.social_name) return true
      return (
        data.social_name.trim().toLowerCase() !==
        data.full_name.trim().toLowerCase()
      )
    },
    {
      message: "O nome social deve ser diferente do nome completo",
      path: ["social_name"],
    },
  )

export const ExtraBasicDataSchema = zod.object({
  gender: zod
    .array(zod.string())
    .refine((value) => value.some((item) => item), {
      message: validationMessages.minOptions(1),
    }),
  orientation: zod
    .array(zod.string())
    .refine((value) => value.some((item) => item), {
      message: validationMessages.minOptions(1),
    }),
  pronouns: zod
    .array(zod.string())
    .refine((value) => value.some((item) => item), {
      message: validationMessages.minOptions(1),
    }),
  race_color: zod
    .array(zod.string())
    .refine((value) => value.some((item) => item), {
      message: validationMessages.minOptions(1),
    }),
})

export const applyToEventSchema = zod.object({
  applicationDate: zod.coerce.date(),
  eventId: zod.string(),
  referrals: zod.string().optional(),
  referred: zod.string().trim().min(1),
  companions: zod.string().optional(),
  bond: zod
    .enum(["Só vou acompanhade.", "Posso ir sozinhe."])
    .default("Posso ir sozinhe."),
  notes: zod.string().optional(),
})
