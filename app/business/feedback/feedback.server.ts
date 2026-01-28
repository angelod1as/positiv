import { composable } from "composable-functions"
import { kyselyDb } from "~/kysely-db"
import type { FeedbackFormData } from "./feedback-schema"

export interface FeedbackWithVerification {
  id: string
  name: string | null
  email: string | null
  whatsapp: string | null
  has_participated: "never" | "once" | "more_than_once"
  feedback_text: string
  can_contact: boolean
  ip_address: string
  created_at: string
  is_verified: boolean
  profile_id: string | null
  social_name: string | null
  full_name: string | null
}

export async function submitFeedback(
  data: Omit<FeedbackFormData, "captchaToken">,
  ipAddress: string,
): Promise<void> {
  await kyselyDb
    .insertInto("feedbacks")
    .values({
      name: data.name ?? null,
      email: data.email || null,
      whatsapp: data.whatsapp || null,
      has_participated: data.hasParticipated,
      feedback_text: data.feedbackText,
      can_contact: data.canContact ?? false,
      ip_address: ipAddress,
    })
    .execute()
}

export const getRecentFeedbacks = composable(
  async (limit: number = 10): Promise<FeedbackWithVerification[]> => {
    const feedbacks = await kyselyDb
      .selectFrom("feedbacks")
      .selectAll()
      .orderBy("created_at", "desc")
      .limit(limit)
      .execute()

    return feedbacks.map((f) => ({
      ...f,
      is_verified: false,
      profile_id: null,
      social_name: null,
      full_name: null,
    }))
  },
)

export const getAllFeedbacksWithVerification = composable(
  async (): Promise<FeedbackWithVerification[]> => {
    const feedbacks = await kyselyDb
      .selectFrom("feedbacks")
      .selectAll()
      .orderBy("created_at", "desc")
      .execute()

    if (feedbacks.length === 0) {
      return []
    }

    const emails = feedbacks
      .map((f) => f.email)
      .filter((e): e is string => e !== null)
    const phoneStrings = feedbacks
      .map((f) => f.whatsapp)
      .filter((w): w is string => w !== null)
      .map((w) => w.replace(/\D/g, ""))
      .filter((p) => p.length >= 10)
    const phones = phoneStrings.map((p) => parseInt(p, 10)).filter((p) => !isNaN(p))

    const profilesWithEmail =
      emails.length > 0
        ? await kyselyDb
            .selectFrom("profiles")
            .select(["id", "email", "social_name", "full_name"])
            .where("email", "in", emails)
            .execute()
        : []

    const profilesWithPhone =
      phones.length > 0
        ? await kyselyDb
            .selectFrom("profiles")
            .select(["id", "phone", "social_name", "full_name"])
            .where("phone", "in", phones)
            .execute()
        : []

    const profileByEmail = new Map(
      profilesWithEmail.map((p) => [
        p.email?.toLowerCase(),
        { id: p.id, social_name: p.social_name, full_name: p.full_name },
      ]),
    )
    const profileByPhone = new Map(
      profilesWithPhone.map((p) => [
        String(p.phone),
        { id: p.id, social_name: p.social_name, full_name: p.full_name },
      ]),
    )

    if (profileByEmail.size === 0 && profileByPhone.size === 0) {
      return feedbacks.map((f) => ({
        ...f,
        is_verified: false,
        profile_id: null,
        social_name: null,
        full_name: null,
      }))
    }

    return feedbacks.map((f) => {
      const emailProfile = f.email
        ? profileByEmail.get(f.email.toLowerCase())
        : undefined
      const phoneProfile = f.whatsapp
        ? profileByPhone.get(f.whatsapp.replace(/\D/g, ""))
        : undefined

      const matchedProfile = emailProfile || phoneProfile

      return {
        ...f,
        is_verified: !!matchedProfile,
        profile_id: matchedProfile?.id ?? null,
        social_name: matchedProfile?.social_name ?? null,
        full_name: matchedProfile?.full_name ?? null,
      }
    })
  },
)
