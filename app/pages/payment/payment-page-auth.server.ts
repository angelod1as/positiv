import type { Params } from "react-router"
import { redirectWithError } from "remix-toast"
import { getContext } from "~/business/auth/auth.server"
import { assertPaymentSystemOnline } from "~/business/payment/payment-guard.server"
import { kyselyDb } from "~/kysely-db"
import paths from "~/lib/paths"

export async function getEventParticipantWithAuth(
  request: Request,
  params: Params,
) {
  assertPaymentSystemOnline()

  const { currentUser } = await getContext(request, params)
  if (!currentUser) {
    throw await redirectWithError(
      paths.auth.LOGIN,
      "Você precisa estar logade para acessar esta página.",
    )
  }

  const eventParticipantId = params.eventParticipantId
  if (!eventParticipantId) {
    throw await redirectWithError(paths.root.HOME, "Link de pagamento inválido.")
  }

  const eventParticipant = await kyselyDb
    .selectFrom("event_participants")
    .innerJoin("events", "events.id", "event_participants.event_id")
    .innerJoin("profiles", "profiles.id", "event_participants.profile_id")
    .select([
      "event_participants.id",
      "event_participants.event_id",
      "events.title as event_title",
    ])
    .where("event_participants.id", "=", eventParticipantId)
    .where("profiles.user_id", "=", currentUser.id)
    .executeTakeFirst()

  if (!eventParticipant) {
    throw await redirectWithError(
      paths.root.HOME,
      "Inscrição não encontrada ou sem permissão.",
    )
  }

  return { eventParticipant, eventParticipantId }
}
