import { applySchema } from "composable-functions"
import { agreeToTermsSchema, contextSchema } from "../common"

export const agreeToTerms = applySchema(
  agreeToTermsSchema,
  contextSchema,
)(async (values, context) => {
  const { supabase, currentProfile, currentUser } = context
  
  // If no user is authenticated, return early
  if (!currentUser || !currentUser.email) return

  // Build the upsert data
  const upsertData: {
    id?: string
    user_id: string
    email: string
    allow_marketing_email: boolean
  } = {
    user_id: currentUser.id,
    email: currentUser.email,
    allow_marketing_email: values.mktEmails || false,
  }

  // If we have a profile, use its ID
  if (currentProfile) {
    upsertData.id = currentProfile.id
  }

  const { error } = await supabase
    .from("profiles")
    .upsert(upsertData)

  if (error) {
    throw new Error("Problema ao atualizar perfil")
  }

  return context
})
