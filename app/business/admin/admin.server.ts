import { applySchema, composable } from "composable-functions"
import { sql } from "kysely"
import type { Params } from "react-router"
import { redirectWithError } from "remix-toast"
import type { z } from "zod"
import { kysely } from "~/kysely"
import { schemaValuesToDB } from "~/lib/helpers/db-values-to-form-schema"
import paths from "~/lib/paths"
import type { Event } from "~types/entities.types"
import { getUserContext } from "../auth/auth.server"
import {
  adminContextSchema,
  eventFormSchema,
  updateEventStatusSchema,
  updateParticipantPropertySchema,
} from "./common"

const {
  admin: {
    ADMIN_DASHBOARD,
    events: { ADMIN_VIEW_EVENT },
  },
} = paths

export const getAdminContext = async (
  request: Request,
  params: Params,
): Promise<z.infer<typeof adminContextSchema>> => {
  const context = await getUserContext(request, params)
  const { error, data } = await context.supabase.from("events").select("*")

  if (error) {
    throw await redirectWithError(
      ADMIN_DASHBOARD,
      "Ocorreu um erro ao buscar eventos",
    )
  }

  const events = data

  return { ...context, events }
}

export const getAdminEventById = async (request: Request, params: Params) => {
  const { supabase } = await getAdminContext(request, params)
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

export type ParticipantWithExtraData = {
  id: string
  full_name: string | null
  social_name: string | null
  pronouns: string[] | null
  gender: string[] | null
  orientation: string[] | null
  phone: number | null
  process_status: string
  is_veteran: boolean | null
  is_social_spot: boolean | null
  was_admin_skipped_last_event: boolean
  payment: number | null
}

export const getAdminParticipantsWithExtraDataById = composable(
  async (eventId: string) => {
    // Main query to get participants information along with if they were skipped in the last event

    const participantsWithExtraData = await kysely
      .selectFrom("event_participants as current_ep")
      .innerJoin("profiles as p", "current_ep.profile_id", "p.id")
      .leftJoin(
        (eb) =>
          eb
            .selectFrom("event_participants as ep")
            .innerJoin("events as e", "ep.event_id", "e.id")
            .select([
              "ep.profile_id",
              "ep.process_status",
              sql<number>`row_number() over (
            partition by ep.profile_id
            order by e.time_event_start desc
          )`.as("rn"),
            ])
            .where("ep.is_user_applied", "=", true)
            .as("ranked_events"),
        (join) =>
          join
            .onRef("ranked_events.profile_id", "=", "current_ep.profile_id")
            .on("ranked_events.rn", "=", 2),
      )
      .select([
        "p.id",
        "p.full_name",
        "p.social_name",
        "p.pronouns",
        "p.phone",
        "p.gender",
        "p.orientation",
        "p.is_veteran",
        "current_ep.payment",
        "current_ep.process_status",
        "current_ep.is_social_spot",
        sql<boolean>`ranked_events.process_status = 'skipped'`.as(
          "was_admin_skipped_last_event",
        ),
      ])
      .where("current_ep.event_id", "=", eventId)
      .where("current_ep.is_user_applied", "=", true)
      .execute()

    return participantsWithExtraData
  },
)

///////
// ACTIONS
//////

export const createOrUpdateEvent = applySchema(
  eventFormSchema,
  adminContextSchema,
)(async (values, context) => {
  const { supabase, eventId } = context

  const parsedValues = schemaValuesToDB(values)

  const { error, data } = await supabase
    .from("events")
    .upsert({
      ...parsedValues,
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

export const updateEventStatus = applySchema(
  updateEventStatusSchema,
  adminContextSchema,
)(async (values, context) => {
  const { supabase, eventId } = context
  if (!eventId) return null

  const { error, data } = await supabase
    .from("events")
    .update({
      ...values,
    })
    .eq("id", eventId)

  if (error) {
    throw await redirectWithError(
      ADMIN_VIEW_EVENT(eventId),
      "Ocorreu um erro ao atualizar o evento. Erro: event update",
    )
  }

  return data
})

export const updateParticipantProperty = composable(
  async (
    eventId: string,
    participantId: string,
    property: z.infer<typeof updateParticipantPropertySchema>["property"],
    value: boolean | number | string,
  ) => {
    const updateProfiles = async () => {
      const result = await kysely
        .updateTable("profiles")
        .set({ [property]: value })
        .where("id", "=", participantId)
        .execute()

      return result.length > 0
    }

    const updateEventParticipants = async () => {
      const result = await kysely
        .updateTable("event_participants")
        .set({ [property]: value })
        .where("event_id", "=", eventId)
        .where("profile_id", "=", participantId)
        .execute()

      return result.length > 0
    }

    if (typeof value === "boolean") {
      if (property === "is_veteran") {
        return await updateProfiles()
      }

      if (property === "is_social_spot") {
        return await updateEventParticipants()
      }

      if (property === "was_admin_skipped_last_event") {
        // For was_admin_skipped_last_event, we need to find the previous event
        // and update its process_status to 'skipped' or not

        // First, get the current event's start time
        const currentEvent = await kysely
          .selectFrom("events")
          .select("time_event_start")
          .where("id", "=", eventId)
          .executeTakeFirst()

        if (!currentEvent) {
          return false
        }

        // Find the previous event for this participant
        const previousEvent = await kysely
          .selectFrom("event_participants as ep")
          .innerJoin("events as e", "ep.event_id", "e.id")
          .select(["ep.id", "ep.process_status"])
          .where("ep.profile_id", "=", participantId)
          .where("ep.is_user_applied", "=", true)
          .where("e.time_event_start", "<", currentEvent.time_event_start)
          .orderBy("e.time_event_start", "desc")
          .limit(1)
          .executeTakeFirst()

        if (!previousEvent) {
          return false
        }

        // Update the process_status of the previous event
        const result = await kysely
          .updateTable("event_participants")
          .set({ process_status: value ? "skipped" : "approved" })
          .where("id", "=", previousEvent.id)
          .execute()

        return result.length > 0
      }
    }

    if (typeof value === "number") {
      return await updateEventParticipants()
    }

    if (typeof value === "string") {
      if (property === "process_status") {
        return await updateEventParticipants()
      }
    }

    return false
  },
)
