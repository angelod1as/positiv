import { redirect } from "react-router"
import { getContext } from "~/business/auth/auth.server"
import { findValidInviteByToken } from "~/business/participant/event-invite.server"
import { Copy } from "~/components/atoms/copy/copy"
import { Link } from "~/components/atoms/link/link"
import { inviteCopy } from "~/copy/events"
import { metaCopy } from "~/copy/meta"
import { createMetaArray } from "~/lib/helpers/meta"
import paths from "~/lib/paths"
import type { Route } from "./+types/invite-page"

const {
  auth: { LOGIN },
  dash: {
    DASHBOARD,
    events: { EVENT_RULES },
  },
  root: { INVITE },
} = paths

export function meta({}: Route.MetaArgs) {
  return createMetaArray(metaCopy.dashboard.title)
}

/**
 * Public on purpose: the person arrives from a link somebody sent them, and
 * more often than not they are signed out. The token names an (event, profile)
 * pair and nothing else -- the profile is what authorizes, so a link handed to
 * the wrong person opens nothing and gives nothing away.
 */
export async function loader({ request, params }: Route.LoaderArgs) {
  const token = params.token
  if (!token) return redirect(DASHBOARD)

  const { currentProfile } = await getContext(request, params)

  if (!currentProfile) {
    const destination = encodeURIComponent(INVITE(token))
    return redirect(`${LOGIN}?redirect_to=${destination}`)
  }

  const invite = await findValidInviteByToken(token)

  if (!invite) return { outcome: "invalid" as const }

  if (invite.profile_id !== currentProfile.id) {
    return { outcome: "wrong-person" as const }
  }

  return redirect(EVENT_RULES(invite.event_id))
}

const InvitePage = ({ loaderData }: Route.ComponentProps) => {
  const message =
    loaderData.outcome === "wrong-person"
      ? inviteCopy.wrongPerson
      : inviteCopy.invalid

  return (
    <div className="flex flex-col gap-4 my-12">
      <h1>{message.title}</h1>
      <Copy>{message.body}</Copy>
      <Link to={DASHBOARD}>{inviteCopy.backToDashboard}</Link>
    </div>
  )
}

export default InvitePage
