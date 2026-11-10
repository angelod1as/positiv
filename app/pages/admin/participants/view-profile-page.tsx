import { NoResultError } from "kysely"
import { redirectWithError } from "remix-toast"
import { getAdminContext } from "~/business/admin/admin.server"
import {
  getParticipantFullEventHistory,
  getProfileById,
  updateProfileAdminNotes,
  updateProfileApprovalStatus,
} from "~/business/profile/profiles.server"
import { setProfileCpfExempt } from "~/business/profile/cpf-exemption.server"
import { ParticipantDetail } from "~/components/pages/admin/participants/participant-detail"
import { adminParticipantsCopy } from "~/copy/admin/participants"
import { logger } from "~/lib/logger/logger.server"
import { assertUuidParams } from "~/lib/helpers/assert-uuid-params"
import paths from "~/lib/paths"
import type { Route } from "./+types/view-profile-page"
import type { ParticipantEventHistoryData } from "~types/database/entities.types"
import { readFormData } from "~/lib/request/read-form-data.server"

const {
  admin: { ADMIN_PARTICIPANTS },
} = paths

export async function loader({ params }: Route.LoaderArgs) {
  assertUuidParams(params.profileId)

  const { profileId } = params

  if (!profileId) {
    return redirectWithError(
      ADMIN_PARTICIPANTS,
      adminParticipantsCopy.viewProfile.profileNotFound,
    )
  }

  const [profileResult, historyResult] = await Promise.all([
    getProfileById({ profileId }),
    getParticipantFullEventHistory({
      profileId,
      excludeEventId: undefined,
    }),
  ])

  if (!profileResult.success) {
    if (profileResult.errors.every((error) => error instanceof NoResultError)) {
      logger.warn("Profile not found", { profileId })
    } else {
      logger.error("Failed to fetch profile", {
        profileId,
        errors: profileResult.errors,
      })
    }
    return redirectWithError(
      ADMIN_PARTICIPANTS,
      adminParticipantsCopy.viewProfile.profileMissing,
    )
  }

  const profile = profileResult.data

  let fullHistory: ParticipantEventHistoryData[] = []
  if (historyResult.success) {
    fullHistory = historyResult.data
  } else {
    logger.error("Failed to fetch participant history", {
      profileId,
      errors: historyResult.errors,
    })
  }

  return {
    profile,
    fullHistory,
  }
}

export async function action({ request, params }: Route.ActionArgs) {
  assertUuidParams(params.profileId)

  await getAdminContext(request, params)

  const formData = await readFormData(request)
  const intent = formData.get("intent")

  if (intent === "update-profile-approval-status") {
    const result = await updateProfileApprovalStatus(Object.fromEntries(formData))
    return { success: result.success }
  }

  if (intent === "update-profile-cpf-exempt") {
    // The profile of the page, not one the form names: the admin decided on
    // the person in front of them.
    const result = await setProfileCpfExempt({
      profileId: params.profileId,
      cpfExempt: formData.get("cpfExempt"),
    })
    // Copied out: React Router turns every Error in action data into
    // "Unexpected Server Error" in a production build.
    return result.success
      ? { success: true }
      : {
          success: false,
          errors: result.errors.map((error) => ({ message: error.message })),
        }
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
