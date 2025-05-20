import { type Params } from "react-router"
import { redirectWithSuccess } from "remix-toast"
import { dateToString } from "~/lib/helpers/date-to-string"
import paths from "~/lib/paths"
import type { EventStatus } from "~types/entities.types"
import { getContext } from "../auth/auth.server"
import { applyToEventSchema } from "../common"
import { sendApplicationMail } from "./send-application-mail.server"

const {
  dash: { DASHBOARD },
} = paths

export const applyToEvent = async (request: Request, params: Params) => {
  const { currentProfile, supabase, supabaseHeaders } = await getContext(
    request,
    params,
  )

  const eventId = params.id
  const formData = await request.formData()
  const applicationDateRaw = formData.get("application_date")
  const confirmedRaw = formData.get("confirmed")
  const notesRaw = formData.get("notes")

  const parsedData = applyToEventSchema.safeParse({
    applicationDate: new Date(applicationDateRaw?.toString() || ""),
    confirmed: Boolean(confirmedRaw),
    notes: notesRaw?.toString(),
  })

  if (!parsedData.success || !currentProfile || !eventId) {
    throw new Error("Oops, algo deu errado na sua inscrição. Tente mais tarde.")
  }

  const profileId = currentProfile.id

  const { data: values } = parsedData

  const { data } = await supabase
    .from("event_participants")
    .select("id")
    .eq("event_id", eventId)
    .eq("profile_id", profileId)
    .single()

  const { error } = await supabase.from("event_participants").upsert({
    id: data?.id,
    event_id: eventId,
    profile_id: profileId,
    application_date: dateToString(values.applicationDate),
    notes: values.notes, // supabase sanitizes automatically
    user_applied_status: true,
  })

  if (error) {
    throw new Error("Sua inscrição teve um erro, tente novamente. Erro: upsert")
  }

  if (currentProfile.email) {
    const { data: event } = await supabase
      .from("events")
      .select("*")
      .eq("id", eventId)
      .single()

    if (event) {
      // purposefully async
      sendApplicationMail({
        profile: currentProfile,
        event: {
          ...event,
          event_status: event.event_status as EventStatus,
        },
      })
    }
  }

  return redirectWithSuccess(
    DASHBOARD,
    {
      message: "Inscrição efetuada com sucesso",
      description: "Você receberá as informações do evento em seu email",
      duration: 3000,
    },
    {
      headers: supabaseHeaders,
    },
  )
}
