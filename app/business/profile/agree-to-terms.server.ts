import { applySchema } from "composable-functions"
import { errorsCopy } from "~/copy/errors"
import { participantCopy } from "~/copy/participant"
import { db } from "~/lib/supabase/db.server"
import { logger } from "~/lib/logger/logger.server"
import { agreeToTermsSchema } from "./profile-schemas"
import { contextSchema } from "../auth/auth-schemas"
import {
  mirrorEmailPreferences,
  recordEmailPreferences,
} from "../newsletter/email-preferences.server"

export const agreeToTerms = applySchema(
  agreeToTermsSchema,
  contextSchema,
)(async (values, context) => {
  const { currentProfile, currentUser } = context

  // If no user is authenticated, throw an error for proper handling
  if (!currentUser || !currentUser.email) {
    throw new Error(errorsCopy.auth.notAuthenticated)
  }

  let profileId: string

  // If we have an existing profile, use it
  if (currentProfile) {
    profileId = currentProfile.id
  } else {
    const normalizedEmail = currentUser.email.toLowerCase().trim()

    const orphanProfile = await db
      .selectFrom("profiles")
      .select("id")
      .where("email", "=", normalizedEmail)
      .where("user_id", "is", null)
      .executeTakeFirst()

    if (orphanProfile) {
      // The .where("user_id", "is", null) guard on the UPDATE protects against a
      // TOCTOU race: if another process claimed the profile between our SELECT and
      // this UPDATE, 0 rows match and executeTakeFirst returns undefined — we surface
      // that as an error rather than silently binding the wrong profile ID to this user.
      const linkedProfile = await db
        .updateTable("profiles")
        .set({ user_id: currentUser.id })
        .where("id", "=", orphanProfile.id)
        .where("user_id", "is", null)
        .returning("id")
        .executeTakeFirst()

      if (!linkedProfile)
        throw new Error(participantCopy.terms.profileLinkFailed)

      profileId = linkedProfile.id
    } else {
      // user_id comes from the session alone; an e-mail or account that
      // already has a profile is refused by profiles_email_unique or the
      // user_id unique key rather than written over.
      const newProfile = await db
        .insertInto("profiles")
        .values({
          user_id: currentUser.id,
          email: normalizedEmail,
        })
        .returning("id")
        .executeTakeFirst()
        .catch((error) => {
          logger.error("Could not create the profile", {
            userId: currentUser.id,
            error,
          })
          return undefined
        })

      if (!newProfile) {
        throw new Error(participantCopy.terms.profileCreateFailed)
      }

      profileId = newProfile.id
    }
  }

  const isOnboarding = !currentProfile || !currentProfile.basic_data_filled
  const source = isOnboarding ? "onboarding_auto" : "terms_and_conditions"
  const preferences = {
    registrationAlerts: values.registrationAlerts,
    newsletter: values.newsletter,
    marketing: values.marketing,
  }

  const recorded = await recordEmailPreferences(profileId, preferences, source)
  if (!recorded.success) throw recorded.errors[0]

  const mirrored = await mirrorEmailPreferences(
    profileId,
    recorded.data,
    preferences,
  )
  if (!mirrored.success) {
    // The choices are on the site; only the lists failed to follow, and the
    // page says so without pretending nothing was saved.
    logger.error("Could not bring Listmonk in line with the email choices", {
      profileId,
      errors: mirrored.errors.map((error) => error.message),
    })
    return {
      ...context,
      newsletterSubscriptionError: participantCopy.terms.newsletterFailed,
    }
  }

  return context
})
