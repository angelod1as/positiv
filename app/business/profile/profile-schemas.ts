import { isValidCpf, normalizeCpf } from "~/lib/helpers/cpf"
import { adminParticipantsCopy } from "~/copy/admin/participants"
import { basicDataValidation } from "~/copy/account"
import { agreeToTermsValidation } from "~/copy/dashboard"
import { PHONE_REGEXP } from "~/lib/constants/constants"
import { isBrazilianMobile, isValidPhone } from "~/lib/helpers/phone"
import { normalizeName } from "~/lib/helpers/strings"
import { validationMessages } from "~/lib/helpers/validation-messages"
import { zod } from "~/lib/helpers/zod"
import type { ZodType } from "zod"
import {
  profileApprovedToAttendStatusEnum,
  profileFlagStatusEnum,
} from "~types/database/entities.types"
import { parseBoolean } from "../application/application-schemas"

/* DASHBOARD */

export const agreeToTermsSchema = zod.object({
  agree: zod.boolean().refine((val) => val, {
    message: agreeToTermsValidation.agree,
  }),
  commonEmails: zod.boolean().refine((val) => val, {
    message: agreeToTermsValidation.commonEmails,
  }),
  mktEmails: zod.boolean().optional(),
})

/* BASIC DATA */
/**
 * The fields on their own, so a question can reuse the rule for exactly one of
 * them. What one field says about another lives in `basicDataSchema`.
 */
export const basicDataFieldsSchema = zod.object({
  full_name: zod.string().min(2).max(255).transform(normalizeName),
  social_name: zod.string().min(2).max(255).transform(normalizeName).nullish(),
  rg: zod.string().min(2),
  rg_issuer: zod.string().min(2),
  // The CPF is what the payment provider identifies the payer by, and it
  // refuses one whose digits do not check out. Caught here, the person gets a
  // sentence they can act on instead of a charge that fails to be created weeks
  // later.
  // min(2) before the rule, so an empty field reads as the missing answer it is
  // rather than as digits that do not add up.
  cpf: zod
    .string()
    .min(2)
    .refine(isValidCpf, { error: basicDataValidation.invalidCpf })
    .transform(normalizeCpf),
  date_of_birth: zod
    .string()
    .pipe(
      zod.coerce.date({
        error: validationMessages.invalidDate,
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
        message: basicDataValidation.minimumAge,
      },
    ),
  phone: zod.coerce
    .number({
      error: basicDataValidation.phoneNotANumber,
    })
    .refine((value) => PHONE_REGEXP.test(value.toString()), {
      message: basicDataValidation.invalidPhone,
    }),
  confirm_phone: zod.coerce
    .number({
      error: basicDataValidation.phoneNotANumber,
    })
    .refine((value) => PHONE_REGEXP.test(value.toString()), {
      message: basicDataValidation.invalidPhone,
    }),
  phone_is_international: zod.boolean().default(false),
  how_came_to_us: zod.string().optional(),
  where_lives: zod.string().optional(),
})

type CrossFieldValues = {
  full_name: string
  social_name?: string | null
  phone: number
  confirm_phone: number
  phone_is_international: boolean
}

/**
 * What one field says about another, for the full set of fields and for the
 * set a CPF-exempt profile answers.
 */
const withCrossFieldRules = <S extends ZodType<CrossFieldValues>>(schema: S) =>
  schema
  // Blamed on the confirmation rather than on the phone: the number typed
  // first is not the one someone is being asked to look at again.
  .refine((data) => data.phone === data.confirm_phone, {
    message: basicDataValidation.phoneMismatch,
    path: ["confirm_phone"],
  })
  .refine(
    (data) => data.phone_is_international || isBrazilianMobile(data.phone),
    {
      message: basicDataValidation.notAMobile,
      path: ["phone"],
    },
  )
  .refine(
    (data) => !data.phone_is_international || isValidPhone(data.phone, true),
    {
      message: basicDataValidation.invalidInternationalPhone,
      path: ["phone"],
    },
  )
  .refine(
    (data) => {
      if (!data.social_name) return true
      return (
        data.social_name.trim().toLowerCase() !==
        data.full_name.trim().toLowerCase()
      )
    },
    {
      message: basicDataValidation.socialNameMustDiffer,
      path: ["social_name"],
    },
  )

export const basicDataSchema = withCrossFieldRules(basicDataFieldsSchema)

/** A profile an admin exempted from the CPF is asked everything else. */
export const cpfExemptBasicDataSchema = withCrossFieldRules(
  basicDataFieldsSchema.omit({ cpf: true }),
)

export const ExtraBasicDataSchema = zod.object({
  gender: zod
    .array(zod.string().max(50))
    .max(10)
    .refine((value) => value.some((item) => item), {
      message: validationMessages.minOptions(1),
    }),
  orientation: zod
    .array(zod.string().max(50))
    .max(10)
    .refine((value) => value.some((item) => item), {
      message: validationMessages.minOptions(1),
    }),
  pronouns: zod
    .array(zod.string().max(50))
    .max(10)
    .refine((value) => value.some((item) => item), {
      message: validationMessages.minOptions(1),
    }),
  race_color: zod
    .array(zod.string().max(50))
    .max(10)
    .refine((value) => value.some((item) => item), {
      message: validationMessages.minOptions(1),
    }),
})

export const updateProfileApprovalStatusSchema = zod.object({
  intent: zod.literal("update-profile-approval-status"),
  profile_id: zod.string().uuid(),
  approved_to_attend: profileApprovedToAttendStatusEnum,
})

export const updateProfileAdminNotesSchema = zod
  .object({
    intent: zod.literal("update-profile-admin-notes"),
    profile_id: zod.string().uuid(),
    flag: profileFlagStatusEnum.optional(),
    flag_notes: zod.string().nullable().optional(),
    general_notes: zod.string().nullable().optional(),
    is_veteran: parseBoolean.optional(),
    approved_to_attend: profileApprovedToAttendStatusEnum.optional(),
  })
  .refine(
    (data) => {
      // If flag is provided and not "none", flag_notes must be provided
      if (data.flag && data.flag !== "none") {
        return (
          data.flag_notes !== null &&
          data.flag_notes !== undefined &&
          data.flag_notes.trim().length > 0
        )
      }
      return true
    },
    {
      message: adminParticipantsCopy.adminNotes.flagNotesRequired,
      path: ["flag_notes"],
    }
  )
