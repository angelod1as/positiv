import { kyselyDb } from "~/kysely-db"
import type { FeedbackFormData } from "./feedback-schema"

export interface FeedbackWithVerification {
  id: string
  name: string | null
  email: string | null
  whatsapp: string | null
  has_participated: "never" | "once" | "more_than_once"
  feedback_text: string
  ip_address: string
  created_at: string
  is_verified: boolean
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
      whatsapp: data.whatsapp ?? null,
      has_participated: data.hasParticipated,
      feedback_text: data.feedbackText,
      ip_address: ipAddress,
    })
    .execute()
}

export async function getRecentFeedbacks(
  limit: number,
): Promise<FeedbackWithVerification[]> {
  const feedbacks = await kyselyDb
    .selectFrom("feedbacks")
    .selectAll()
    .orderBy("created_at", "desc")
    .limit(limit)
    .execute()

  return feedbacks.map((f) => ({
    ...f,
    is_verified: false,
  }))
}

export async function getAllFeedbacksWithVerification(): Promise<
  FeedbackWithVerification[]
> {
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
  const phones = feedbacks
    .map((f) => f.whatsapp)
    .filter((w): w is string => w !== null)
    .map((w) => parseInt(w.replace(/\D/g, ""), 10))
    .filter((p) => !isNaN(p))

  const profilesWithEmail =
    emails.length > 0
      ? await kyselyDb
          .selectFrom("profiles")
          .select("email")
          .where("email", "in", emails)
          .execute()
      : []

  const profilesWithPhone =
    phones.length > 0
      ? await kyselyDb
          .selectFrom("profiles")
          .select("phone")
          .where("phone", "in", phones)
          .execute()
      : []

  const verifiedEmails = new Set(
    profilesWithEmail.map((p) => p.email?.toLowerCase()),
  )
  const verifiedPhones = new Set(
    profilesWithPhone.map((p) => String(p.phone)),
  )

  return feedbacks.map((f) => {
    const emailVerified = f.email
      ? verifiedEmails.has(f.email.toLowerCase())
      : false
    const phoneVerified = f.whatsapp
      ? verifiedPhones.has(f.whatsapp.replace(/\D/g, ""))
      : false

    return {
      ...f,
      is_verified: emailVerified || phoneVerified,
    }
  })
}
