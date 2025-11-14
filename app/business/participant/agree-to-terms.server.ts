import { applySchema } from "composable-functions"
import { agreeToTermsSchema, contextSchema } from "../common"
import { subscribeProfileToNewsletter } from "../newsletter/auto-subscribe.server"
import { unsubscribeProfile } from "../newsletter/subscription-helpers.server"

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
  const subscriptionSource = isOnboarding
    ? "onboarding_auto"
    : "terms_and_conditions"

  if (wantsMarketing) {
    const result = await subscribeProfileToNewsletter(
      profileId,
      subscriptionSource,
    )
    if (!result.success) {
      console.error(
        "Failed to subscribe profile to newsletter:",
        result.errors.map(e => e.message).join(", "),
      )
      return {
        ...context,
        newsletterSubscriptionError:
          "Não foi possível inscrevê-lo na newsletter. Entre em contato com os administradores em partypositiv@gmail.com",
      }
    }
    if (result.data?.syncStatus === "failed") {
      console.warn(
        "Newsletter subscription created but sync failed. Will be retried by cron job.",
        { profileId, subscriptionSource },
      )
    }
  } else {
    const result = await unsubscribeProfile(profileId)
    if (!result.success && result.errors.length > 0) {
      // It's ok if unsubscribe fails because no subscription exists.
      // For other errors, we should throw.
      if (!result.errors[0].message.includes("No subscription found")) {
        console.error("Failed to unsubscribe profile:", result.errors[0].message)
        throw result.errors[0]
      }
    }
  }

  return context
})
