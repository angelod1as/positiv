import { isPaymentSystemEnabled } from "~/lib/features.server"
import { kyselyDb } from "~/kysely-db"

export type ValidatePaymentTokenResult =
  | { status: "not_found" }
  | { status: "expired"; data: { eventTitle: string; eventEmoji: string | null } }
  | { status: "already_paid"; data: { eventTitle: string; eventEmoji: string | null } }
  | {
      status: "ready"
      data: {
        eventTitle: string
        eventEmoji: string | null
        participantName: string
        participantId: string
        profileId: string
        eventId: string
        cpf: string | null
        email: string | null
        fullName: string | null
        socialName: string | null
      }
    }

export async function validatePaymentToken(
  token: string
): Promise<ValidatePaymentTokenResult> {
  if (!isPaymentSystemEnabled()) {
    return { status: "not_found" }
  }

  const participant = await kyselyDb
    .selectFrom("event_participants")
    .innerJoin("profiles", "profiles.id", "event_participants.profile_id")
    .innerJoin("events", "events.id", "event_participants.event_id")
    .select([
      "event_participants.id as participant_id",
      "event_participants.profile_id",
      "event_participants.event_id",
      "event_participants.has_paid",
      "event_participants.payment_link_expires_at",
      "profiles.full_name",
      "profiles.social_name",
      "profiles.email",
      "profiles.cpf",
      "events.title as event_title",
      "events.emoji as event_emoji",
    ])
    .where("event_participants.payment_link_token", "=", token)
    .executeTakeFirst()

  if (!participant) {
    return { status: "not_found" }
  }

  const eventTitle = participant.event_title ?? "Evento"
  const eventEmoji = participant.event_emoji

  if (
    participant.payment_link_expires_at &&
    new Date(participant.payment_link_expires_at) < new Date()
  ) {
    return { status: "expired", data: { eventTitle, eventEmoji } }
  }

  if (participant.has_paid) {
    return { status: "already_paid", data: { eventTitle, eventEmoji } }
  }

  const transactions = await kyselyDb
    .selectFrom("payment_transactions")
    .select(["status"])
    .where("event_participant_id", "=", participant.participant_id)
    .where("event_id", "=", participant.event_id)
    .execute()

  const hasConfirmed = transactions.some((t) => t.status === "confirmed")
  if (hasConfirmed) {
    return { status: "already_paid", data: { eventTitle, eventEmoji } }
  }

  const displayName = participant.social_name ?? participant.full_name ?? "Participante"

  if (!participant.profile_id) {
    return { status: "not_found" }
  }

  return {
    status: "ready",
    data: {
      eventTitle,
      eventEmoji,
      participantName: displayName,
      participantId: participant.participant_id,
      profileId: participant.profile_id,
      eventId: participant.event_id,
      cpf: participant.cpf,
      email: participant.email,
      fullName: participant.full_name,
      socialName: participant.social_name,
    },
  }
}
