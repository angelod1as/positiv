import { applySchema } from "composable-functions"
import { redirect } from "react-router"
import type { z } from "zod"
import { dateToString } from "~/lib/helpers/date-to-string"
import paths from "~/lib/paths"
import {
  basicDataSchema,
  contextSchema,
  genderPronounOrientationSchema,
} from "../common"

export const basicData = applySchema(
  basicDataSchema,
  contextSchema,
)(async (values, context) => {
  const { supabase, currentProfile } = context

  if (!currentProfile) {
    throw new Error("Erro ao buscar usuário")
  }

  const { confirm_phone, ...data } = values

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      ...data,
      date_of_birth: dateToString(data.date_of_birth),
    })
    .eq("id", currentProfile.id)
    .single()

  if (updateError) {
    const { code, message } = updateError || {}
    throw new Error(
      `Erro atualizando o usuário — Código: "${code}" — Mensagem: "${message}"`,
    )
  }

  return context
})

type GenderPronounsOrientationProps = {
  formData: z.infer<typeof genderPronounOrientationSchema>
  context: z.infer<typeof contextSchema>
}

const {
  dash: { DASHBOARD },
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
    throw new Error("Algo deu errado com seu formulário, tente de novo.")
  }

  const basicValidation = basicDataSchema.safeParse({
    ...currentProfile,
    confirm_phone: currentProfile.phone,
  })

  if (!basicValidation.success) {
    throw new Error(
      "Parece que há algo faltando no formulário anterior, retorne.",
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

  return redirect(DASHBOARD, {
    headers: supabaseHeaders,
  })
}
