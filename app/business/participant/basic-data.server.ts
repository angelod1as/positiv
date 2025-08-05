import { applySchema } from "composable-functions"
import { redirectWithError, redirectWithSuccess } from "remix-toast"
import type { z } from "zod"
import { dateToString } from "~/lib/helpers/date-to-string"
import { schemaValuesToDB } from "~/lib/helpers/db-values-to-form-schema"
import paths from "~/lib/paths"
import {
  basicDataSchema,
  contextSchema,
  genderPronounOrientationSchema,
} from "../common"

const {
  auth: { LOGIN },
} = paths

export const basicData = applySchema(
  basicDataSchema,
  contextSchema,
)(async (values, context) => {
  const { supabase, currentProfile, currentUser } = context
  const parsedValues = schemaValuesToDB(values)
  if (!currentUser || !currentUser.email) {
    throw await redirectWithError(LOGIN, "Ocorreu um erro com sua autenticação")
  }

  const { confirm_phone, ...data } = parsedValues

  // Check for orphaned profile with user's email
  const { data: orphanedProfile, error: orphanedError } = await supabase
    .from("profiles")
    .select("*")
    .eq("email", currentUser.email)
    .is("user_id", null)
    .single()

  // If there's an error other than "no rows", throw it
  if (orphanedError && orphanedError.code !== 'PGRST116') {
    throw new Error(`Error checking for orphaned profile: ${orphanedError.message}`)
  }

  // Build upsert data with optional id
  const profileId = orphanedProfile?.id || currentProfile?.id
  // Preserve allow_marketing_email from existing profile
  const existingProfile = orphanedProfile || currentProfile
  const upsertData = {
    ...data,
    date_of_birth: dateToString(data.date_of_birth),
    user_id: currentUser.id,
    email: currentUser.email,
    ...(profileId ? { id: profileId } : {}),
    // Preserve allow_marketing_email if it exists in the profile
    ...(existingProfile?.allow_marketing_email !== undefined 
      ? { allow_marketing_email: existingProfile.allow_marketing_email }
      : {}),
  }

  const { error: upsertError } = await supabase.from("profiles").upsert(upsertData)

  if (upsertError) {
    const { code, message } = upsertError || {}
    throw new Error(
      `Erro atualizando o perfil — Código: "${code}" — Mensagem: "${message}"`,
    )
  }

  return context
})

type GenderPronounsOrientationProps = {
  formData: z.infer<typeof genderPronounOrientationSchema>
  context: z.infer<typeof contextSchema>
}

const {
  dash: {
    DASHBOARD,
    account: { GENDER_PRONOUNS_ORIENTATION, BASIC_DATA },
  },
} = paths

export const genderPronounsOrientation = async ({
  formData,
  context,
}: GenderPronounsOrientationProps) => {
  const { supabase, currentProfile, supabaseHeaders } = context

  if (!currentProfile) {
    throw new Error("Erro ao buscar usuário")
  }

  const formValidation = genderPronounOrientationSchema.safeParse(formData)

  if (!formValidation.success) {
    throw await redirectWithError(
      GENDER_PRONOUNS_ORIENTATION,
      "Algo deu errado com seu formulário, tente de novo.",
    )
  }

  const basicValidation = basicDataSchema.safeParse({
    ...currentProfile,
    confirm_phone: currentProfile.phone,
  })

  if (!basicValidation.success) {
    throw await redirectWithError(
      BASIC_DATA,
      "Parece que há algo faltando neste formulário, tente novamente.",
    )
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      ...formValidation.data,
      basic_data_filled: true,
    })
    .eq("id", currentProfile.id)
    .select()
    .single()

  if (updateError) {
    const { code, message } = updateError || {}
    throw new Error(
      `Erro atualizando o usuário — Código: "${code}" — Mensagem: "${message}"`,
    )
  }

  return redirectWithSuccess(DASHBOARD, "Dados salvos com sucesso", {
    headers: supabaseHeaders,
  })
}
