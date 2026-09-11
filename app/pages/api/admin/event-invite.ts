import type { ActionFunctionArgs } from "react-router"
import { getAdminContext } from "~/business/admin/admin.server"
import {
  createInvite,
  listInvitesForEvent,
  revokeInvite,
} from "~/business/admin/event-invites.server"
import { searchProfilesForInvite } from "~/business/admin/search-profiles.server"
import { zod } from "~/lib/helpers/zod"

/**
 * A route of its own rather than the page's action, for the reason the other
 * admin endpoints have one: the modal asks and waits for a verdict, and a POST
 * to a page route is a document submission React Router answers with HTML.
 */
const bodySchema = zod.discriminatedUnion("intent", [
  zod.object({
    intent: zod.literal("search"),
    eventId: zod.string().min(1),
    term: zod.string(),
  }),
  zod.object({
    intent: zod.literal("create"),
    eventId: zod.string().min(1),
    profileId: zod.string().min(1),
  }),
  zod.object({
    intent: zod.literal("revoke"),
    eventId: zod.string().min(1),
    inviteId: zod.string().min(1),
  }),
])

export async function action({ request, params }: ActionFunctionArgs) {
  await getAdminContext(request, params)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    // No field is to blame for a body the server cannot read, so the modal is
    // left to say the save failed.
    return Response.json({ ok: false }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) return Response.json({ ok: false }, { status: 422 })

  const values = parsed.data

  if (values.intent === "search") {
    const results = await searchProfilesForInvite(values.eventId, values.term)
    return Response.json({ ok: true, results })
  }

  if (values.intent === "create") {
    await createInvite({
      eventId: values.eventId,
      profileId: values.profileId,
    })
  }

  if (values.intent === "revoke") {
    await revokeInvite(values.eventId, values.inviteId)
  }

  const invites = await listInvitesForEvent(values.eventId)
  return Response.json({ ok: true, invites })
}
