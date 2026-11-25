import { redirectWithError } from "remix-toast"
import { getAdminContext } from "~/business/auth/admin-context.server"
import { getParticipantLikertSubmission } from "~/business/profile/participant-likert.server"
import { getProfileById } from "~/business/profile/profiles.server"
import { LikertSubmission } from "~/components/pages/admin/participants/likert-submission"
import { adminParticipantsCopy } from "~/copy/admin/participants"
import { assertUuidParams } from "~/lib/helpers/assert-uuid-params"
import { zod } from "~/lib/helpers/zod"
import paths from "~/lib/paths"
import type { Route } from "./+types/likert-submission-page"

const {
  admin: {
    ADMIN_PARTICIPANTS,
    ADMIN_VIEW_PARTICIPANT,
    events: { ADMIN_EVENT_VIEW_PARTICIPANT },
  },
} = paths

export async function loader({ request, params }: Route.LoaderArgs) {
  assertUuidParams(params.profileId, params.submissionId)

  const { profileId, submissionId } = params
  const { currentProfile } = await getAdminContext(request, params)

  const evento = new URL(request.url).searchParams.get("evento")
  const eventId = zod.string().uuid().safeParse(evento).success ? evento : null

  const [profileResult, page] = await Promise.all([
    getProfileById({ profileId }),
    getParticipantLikertSubmission({
      profileId,
      submissionId,
      viewer: currentProfile,
    }),
  ])

  if (!profileResult.success) {
    return redirectWithError(
      ADMIN_PARTICIPANTS,
      adminParticipantsCopy.viewProfile.profileMissing,
    )
  }

  if (!page) {
    return redirectWithError(
      eventId
        ? ADMIN_EVENT_VIEW_PARTICIPANT(eventId, profileId)
        : ADMIN_VIEW_PARTICIPANT(profileId),
      adminParticipantsCopy.likertSubmission.notFound,
    )
  }

  const profile = profileResult.data

  return {
    profileId,
    name: profile.social_name || profile.full_name || "",
    eventId,
    ...page,
  }
}

const LikertSubmissionPage = ({ loaderData }: Route.ComponentProps) => (
  <LikertSubmission {...loaderData} />
)

export default LikertSubmissionPage
