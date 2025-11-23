import { applySchema } from "composable-functions"
import { redirectWithError, redirectWithSuccess } from "remix-toast"
import type { z } from "zod"
import { dateToString } from "~/lib/helpers/date-to-string"
import { schemaValuesToDB } from "~/lib/helpers/db-values-to-form-schema"
import { db } from "~/lib/supabase/db.server"
import paths from "~/lib/paths"
import { basicDataSchema, contextSchema, ExtraBasicDataSchema } from "../common"
import { subscribeProfileToNewsletter } from "../newsletter/auto-subscribe.server"
import type { SubscriptionSource } from "../newsletter/types"

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
  if (orphanedError && orphanedError.code !== "PGRST116") {
    throw new Error(
      `Error checking for orphaned profile: ${orphanedError.message}`,
    )
  }

  // Build upsert data with optional id
  const profileId = orphanedProfile?.id || currentProfile?.id

  // Build base upsert data
  interface ProfileUpsertData {
    [key: string]:
      | string
      | number
      | boolean
      | null
      | undefined
      | Date
      | string[]
    id?: string
    user_id: string
    email: string
    date_of_birth: string | null
  }

  const upsertData: ProfileUpsertData = {
    ...data,
    date_of_birth: dateToString(data.date_of_birth),
    user_id: currentUser.id,
    email: currentUser.email,
  }

  // Add profile ID if exists
  if (profileId) {
    upsertData.id = profileId
  }

  // Note: Newsletter subscription preferences are now managed via newsletter_subscriptions table
  // No need to preserve allow_marketing_email here

  const { error: upsertError } = await supabase
    .from("profiles")
    .upsert(upsertData, { onConflict: 'user_id' })

  if (upsertError) {
    const code = upsertError?.code ?? "UNKNOWN"
    const message = upsertError?.message ?? String(upsertError)
    throw new Error(
      `Erro atualizando o perfil — Código: "${code}" — Mensagem: "${message}"`,
    )
  }

  return context
})

type ExtraBasicDataProps = {
  formData: z.infer<typeof ExtraBasicDataSchema>
  context: z.infer<typeof contextSchema>
}

const {
  dash: {
    DASHBOARD,
    account: { GENDER_PRONOUNS_ORIENTATION, BASIC_DATA },
  },
} = paths

export const extraBasicData = async ({
  formData,
  context,
}: ExtraBasicDataProps) => {
  const { currentProfile, supabaseHeaders } = context

  if (!currentProfile) {
    throw new Error("Erro ao buscar usuário")
  }

  const extraDataValidation = ExtraBasicDataSchema.safeParse(formData)

  if (!extraDataValidation.success) {
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

  await db
    .updateTable("profiles")
    .set({
      ...extraDataValidation.data,
      basic_data_filled: true,
    })
    .where("id", "=", currentProfile.id)
    .execute()

  const subscription = await db
    .selectFrom("newsletter_subscriptions")
    .select(["consent_given", "subscription_source"])
    .where("profile_id", "=", currentProfile.id)
    .where("consent_given", "=", true)
    .executeTakeFirst()

  if (subscription?.subscription_source) {
    await subscribeProfileToNewsletter(
      currentProfile.id,
      subscription.subscription_source as SubscriptionSource,
    )
  }

  return redirectWithSuccess(DASHBOARD, "Dados salvos com sucesso", {
    headers: supabaseHeaders,
  })
}
