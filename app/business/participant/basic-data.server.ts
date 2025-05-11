import { applySchema } from "composable-functions"
import { dateToString } from "~/lib/helpers/date-to-string"
import { basicDataSchema, contextSchema } from "../common"

export const basicData = applySchema(
  basicDataSchema,
  contextSchema,
)(async (values, context) => {
  const { supabase, currentUser } = context

  if (!currentUser) throw new Error("Erro ao buscar usuário")

  const {
    confirm_phone,
    // gender, orientation, pronouns, // TODO: Missing
    ...data
  } = values

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      ...data,
      date_of_birth: dateToString(data.date_of_birth),
      // TODO: Missing
      // gender: gender.filter(Boolean),
      // orientation: orientation.filter(Boolean),
      // pronouns: pronouns.filter(Boolean),
      basic_data_filled: true,
    })
    .eq("user_id", currentUser.id)
    .single()

  if (updateError) {
    const { code, message } = updateError || {}
    throw new Error(
      `Erro atualizando o usuário — Código: "${code}" — Mensagem: "${message}"`,
    )
  }

  return context
})
