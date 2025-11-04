import { applySchema } from "composable-functions"
import { agreeToTermsSchema, contextSchema } from "../common"
import { subscribeProfile, unsubscribeProfile } from "../newsletter/subscription-helpers.server"

export const agreeToTerms = applySchema(
  agreeToTermsSchema,
  contextSchema,
)(async (values, context) => {
  const { supabase, currentProfile, currentUser } = context

  // If no user is authenticated, throw an error for proper handling
  if (!currentUser || !currentUser.email) {
    throw new Error("Usuário não autenticado")
  }

  let profileId: string

  // If we have an existing profile, use it
  if (currentProfile) {
    profileId = currentProfile.id
  } else {
    // Create a new profile
    const { data: newProfile, error } = await supabase
      .from("profiles")
      .insert({
        user_id: currentUser.id,
        email: currentUser.email,
      })
      .select("id")
      .single()

    if (error || !newProfile) {
      throw new Error("Problema ao criar perfil")
    }

    profileId = newProfile.id
  }

  // Handle newsletter subscription separately using the new table
  const wantsMarketing = values.mktEmails || false

  // Determine subscription source based on whether this is initial onboarding
  // or a manual change after completing basic data
  const isOnboarding = !currentProfile || !currentProfile.basic_data_filled
  const subscriptionSource = isOnboarding ? "onboarding_auto" : "terms_and_conditions"

  if (wantsMarketing) {
    const result = await subscribeProfile(profileId, subscriptionSource)
    if (!result.success) {
      console.error("Failed to subscribe profile:", result.error)
      throw new Error("Problema ao processar preferência de emails")
    }
  } else {
    const result = await unsubscribeProfile(profileId)
    // It's ok if unsubscribe fails because no subscription exists
    if (!result.success && result.error !== "No subscription found") {
      console.error("Failed to unsubscribe profile:", result.error)
      throw new Error("Problema ao processar preferência de emails")
    }
  }

  return context
})
