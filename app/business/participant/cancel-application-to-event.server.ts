import { type Params } from "react-router"
import { dateToString } from "~/lib/helpers/date-to-string"
import { getContext } from "../auth/auth.server"

export const cancelApplicationToEvent = async (
  request: Request,
  params: Params,
) => {
  const { currentProfile, supabase } = await getContext(request, params)

  const formData = await request.formData()
  const cancelRaw = formData.get("cancel")
  const eventIdRaw = formData.get("eventId")
  const eventId = eventIdRaw?.toString()
  const cancel = Boolean(cancelRaw)

  if (!cancel || !currentProfile || !eventId) {
    throw new Error("Algo deu errado no seu cancelamento. Tente mais tarde.")
  }

  const profileId = currentProfile.id

  const { error } = await supabase
    .from("event_participants")
    .update({
      user_applied_status: false,
      cancellation_date: dateToString(new Date()),
    })
    .eq("event_id", eventId)
    .eq("profile_id", profileId)
    .eq("user_applied_status", true)

  if (error) {
    throw new Error(
      "Seu cancelamento teve um erro, tente novamente. Erro: update",
    )
  }
}
