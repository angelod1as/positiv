import { applySchema } from "composable-functions"
import type { Params } from "react-router"
import { dataWithError, redirectWithError } from "remix-toast"
import type { z } from "zod"
import paths from "~/lib/paths"
import type { Event } from "~types/entities.types"
import { getUserContext } from "../auth/auth.server"
import {
  adminContextSchema,
  createOrUpdateEventSchema,
  eventFormSchema,
} from "./common"

const {
  admin: { ADMIN_DASHBOARD },
} = paths

export const getAdminContext = async (
  request: Request,
  params: Params,
): Promise<z.infer<typeof adminContextSchema>> => {
  const context = await getUserContext(request, params)
  const { error, data } = await context.supabase.from("events").select("*")

  if (error) {
    throw await dataWithError(
      ADMIN_DASHBOARD,
      "Ocorreu um erro ao buscar eventos",
    )
  }

  const events = data

  return { ...context, events }
}

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
  createOrUpdateEventSchema,
)(async (values, context) => {
  const { supabase, eventId } = context

  const { error, data } = await supabase
    .from("events")
    .upsert({
      ...values,
      id: eventId,
    })
    .select("id")
    .single()

  if (error) {
    throw new Error(
      "Ocorreu um erro adicionando seu evento, tente novamente. Erro: upsert",
    )
  }

  return data.id
})
