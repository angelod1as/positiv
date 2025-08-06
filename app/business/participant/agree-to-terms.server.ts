import { applySchema } from "composable-functions"
import { agreeToTermsSchema, contextSchema } from "../common"

export const agreeToTerms = applySchema(
  agreeToTermsSchema,
  contextSchema,
)(async (values, context) => {
  const { supabase, currentProfile, currentUser } = context
  
  // If no user is authenticated, throw an error for proper handling
  if (!currentUser || !currentUser.email) {
    throw new Error("Usuário não autenticado")
  }

  // If we have an existing profile, update only the marketing preference
  if (currentProfile) {
    const { error } = await supabase
      .from("profiles")
      .update({
        allow_marketing_email: values.mktEmails || false,
      })
      .eq('id', currentProfile.id)

    if (error) {
      throw new Error("Problema ao atualizar perfil")
    }
  } else {
    // Create a new profile with marketing preference
    const { error } = await supabase
      .from("profiles")
      .insert({
        user_id: currentUser.id,
        email: currentUser.email,
        allow_marketing_email: values.mktEmails || false,
      })

    if (error) {
      throw new Error("Problema ao criar perfil")
    }
  }

  return context
})
