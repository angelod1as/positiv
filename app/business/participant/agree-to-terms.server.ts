import { applySchema } from "composable-functions"
import { agreeToTermsSchema, contextSchema } from "../common"

export const agreeToTerms = applySchema(
  agreeToTermsSchema,
  contextSchema,
)(async (values, context) => {
  const { supabase, currentProfile, currentUser } = context
  
  // If no user is authenticated, return early
  if (!currentUser) return

  // Build the upsert data
  const upsertData: any = {
    allow_marketing_email: values.mktEmails || false,
  }

  // If we have a profile, use its ID, otherwise create a new one
  if (currentProfile) {
    upsertData.id = currentProfile.id
    upsertData.user_id = currentUser.id
    upsertData.email = currentUser.email || currentProfile.email
  } else {
    // Creating a new profile
    upsertData.user_id = currentUser.id
    upsertData.email = currentUser.email
  }

  const { error } = await supabase
    .from("profiles")
    .upsert(upsertData)

  if (error) {
    throw new Error("Problema ao atualizar perfil")
  }

  return context
})
