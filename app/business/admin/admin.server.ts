import { applySchema } from "composable-functions"
import type { Params } from "react-router"
import { redirectWithError } from "remix-toast"
import paths from "~/lib/paths"
import type { Event } from "~types/entities.types"
import { getUserContext } from "../auth/auth.server"
import { userContextSchema } from "../common"
import { eventFormSchema } from "./common"

const {
  admin: { ADMIN_DASHBOARD },
} = paths

export const getAdminEventById = async (request: Request, params: Params) => {
  const { supabase } = await getUserContext(request, params)
  const eventId = params.id
  if (!eventId) return undefined

  const { error, data } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single()
  if (error || !data) {
    throw await redirectWithError(ADMIN_DASHBOARD, "Evento não encontrado")
  }

  return data as Event
}

export const createOrUpdateEvent = applySchema(
  eventFormSchema,
  userContextSchema,
)(async (values, context) => {
  const { supabase } = context

  const { error, data } = await supabase
    .from("events")
    .upsert(values)
    .select("id")
    .single()

  if (error) {
    throw new Error(
      "Ocorreu um erro adicionando seu evento, tente novamente. Erro: upsert",
    )
  }

  return data.id
})
