import type { ActionFunctionArgs } from "react-router"
import {
  addParticipantsDirectly,
  EventNotAcceptingAdditionsError,
} from "~/business/application/add-participants-directly.server"
import { getAdminContext } from "~/business/auth/admin-context.server"
import { requirePermission } from "~/business/auth/guards.server"
import { PERMISSIONS } from "~/business/auth/permissions"
import { searchProfilesForInvite } from "~/business/reporting/search-profiles.server"
import { zod } from "~/lib/helpers/zod"
import { Constants } from "~/types/database/database.types"

/**
 * A route of its own rather than the page's action, like the invite endpoint:
 * the modal asks and waits for a verdict, and a POST to a page route is a
 * document submission React Router answers with HTML.
 */
const bodySchema = zod.discriminatedUnion("intent", [
  zod.object({
    intent: zod.literal("search"),
    eventId: zod.string().uuid(),
    term: zod.string(),
  }),
  zod.object({
    intent: zod.literal("add"),
    eventId: zod.string().uuid(),
    people: zod
      .array(
        zod.object({
          profileId: zod.string().uuid(),
          spotType: zod.enum(Constants.public.Enums.spot_type),
        }),
      )
      .min(1),
  }),
])

export async function action({ request, params }: ActionFunctionArgs) {
  const { currentProfile } = await getAdminContext(request, params)
  await requirePermission(currentProfile, PERMISSIONS.PARTICIPANTS_ADD_DIRECTLY)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ ok: false }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) return Response.json({ ok: false }, { status: 422 })

  const values = parsed.data

  if (values.intent === "search") {
    const results = await searchProfilesForInvite(values.eventId, values.term, {
      eligibleOnly: true,
    })
    return Response.json({ ok: true, results })
  }

  try {
    const outcomes = await addParticipantsDirectly({
      eventId: values.eventId,
      people: values.people,
    })
    return Response.json({ ok: true, outcomes })
  } catch (error) {
    if (!(error instanceof EventNotAcceptingAdditionsError)) throw error
    return Response.json({ ok: false, error: error.message }, { status: 422 })
  }
}
