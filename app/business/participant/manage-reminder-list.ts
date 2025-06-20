import { composable } from "composable-functions"
import { type Params } from "react-router"
import { kysely } from "~/kysely"
import { getContext } from "../auth/auth.server"

export const addUserToReminderList = composable(
  async (request: Request, params: Params) => {
    const { currentProfile } = await getContext(request, params)

    const formData = await request.formData()
    const eventIdRaw = formData.get("eventId")
    const eventId = eventIdRaw?.toString()
    const profileId = currentProfile?.id

    if (!profileId || !eventId) {
      throw new Error(
        "Algo deu errado no seu lembrete. Entre em contato com o administrador.",
      )
    }

    // Upsert
    const result = await kysely
      .insertInto("event_reminders")
      .values({
        event_id: eventId,
        profile_id: profileId,
      })
      .onConflict((oc) => oc.columns(["event_id", "profile_id"]).doNothing())
      .execute()

    return result.length > 0
  },
)

export const removeUserFromReminderList = composable(
  async (request: Request, params: Params) => {
    const { currentProfile } = await getContext(request, params)

    const formData = await request.formData()
    const eventIdRaw = formData.get("eventId")
    const eventId = eventIdRaw?.toString()

    if (!currentProfile || !eventId) {
      throw new Error(
        "Algo deu errado ao remover seu lembrete. Entre em contato com o administrador.",
      )
    }

    const profileId = currentProfile.id

    const result = await kysely
      .deleteFrom("event_reminders")
      .where("event_id", "=", eventId)
      .where("profile_id", "=", profileId)
      .execute()

    return result.length > 0
  },
)
