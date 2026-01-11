import { redirectWithError } from "remix-toast"
import {
  getParticipantFullEventHistory,
  getProfileById,
} from "~/business/admin/admin.server"
import { ParticipantDetail } from "~/components/pages/admin/participants/participant-detail"
import paths from "~/lib/paths"
import type { Route } from "./+types/view-profile-page"
import type { ParticipantVsEvent } from "~types/database/entities.types"

const {
  admin: { ADMIN_PARTICIPANTS },
} = paths

export async function loader({ params }: Route.LoaderArgs) {
  const { profileId } = params

  if (!profileId) {
    return redirectWithError(ADMIN_PARTICIPANTS, "Perfil não encontrado")
  }

  const profileResult = await getProfileById({ profileId })

  if (!profileResult.success) {
    console.error("Error fetching profile:", profileResult.errors)
    return redirectWithError(
      ADMIN_PARTICIPANTS,
      "Perfil não encontrado ou não existe.",
    )
  }

  const profile = profileResult.data

  let fullHistory: Array<ParticipantVsEvent & { time_event_start: string }> = []
  const historyResult = await getParticipantFullEventHistory({
    profileId: profile.id,
    excludeEventId: undefined,
  })

  if (historyResult.success) {
    fullHistory = historyResult.data
  }

  return {
    profile,
    fullHistory,
  }
}

const ViewProfilePage = ({ loaderData }: Route.ComponentProps) => {
  const { profile, fullHistory } = loaderData

  if (!profile) return null

  return <ParticipantDetail profile={profile} fullHistory={fullHistory} />
}

export default ViewProfilePage
