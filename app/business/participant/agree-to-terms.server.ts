import { applySchema } from "composable-functions"
import { agreeToTermsSchema, contextSchema } from "../common"

export const agreeToTerms = applySchema(
  agreeToTermsSchema,
  contextSchema,
)(async (values, context) => {
  const { supabase, currentProfile } = context
  if (!currentProfile) return

  const { error } = await supabase
    .from("profiles")
    .update({
      allow_marketing_email: values.mktEmails || false,
    })
    .eq("id", currentProfile.id)

  if (error) {
    throw new Error("Problema ao atualizar perfil")
  }

  return context
})
