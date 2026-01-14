import { redirectWithError } from "remix-toast"
import {
  getParticipantFullEventHistory,
  getProfileById,
  updateProfileAdminNotes,
  updateProfileApprovalStatus,
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

  const [profileResult, historyResult] = await Promise.all([
    getProfileById({ profileId }),
    getParticipantFullEventHistory({
      profileId,
      excludeEventId: undefined,
    }),
  ])

  if (!profileResult.success) {
    console.error("Error fetching profile:", profileResult.errors)
    return redirectWithError(
      ADMIN_PARTICIPANTS,
      "Perfil não encontrado ou não existe.",
    )
  }

  const profile = profileResult.data

  let fullHistory: Array<ParticipantVsEvent & { time_event_start: string }> = []
  if (historyResult.success) {
    fullHistory = historyResult.data
  } else {
    console.error("Error fetching history:", historyResult.errors)
  }

  return {
    profile,
    fullHistory,
  }
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData()
  const intent = formData.get("intent")

  if (intent === "update-profile-approval-status") {
    const result = await updateProfileApprovalStatus(Object.fromEntries(formData))
    return { success: result.success }
  }

  if (intent === "update-profile-admin-notes") {
    const result = await updateProfileAdminNotes(Object.fromEntries(formData))
    return { success: result.success, errors: result.success ? undefined : result.errors }
  }

  return { success: false }
}

const ViewProfilePage = ({ loaderData }: Route.ComponentProps) => {
  const { profile, fullHistory } = loaderData

  if (!profile) return null

  return <ParticipantDetail profile={profile} fullHistory={fullHistory} />
}

export default ViewProfilePage
