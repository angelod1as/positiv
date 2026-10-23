import type { ActionFunctionArgs } from "react-router"
import { useLoaderData } from "react-router"
import { redirectWithError } from "remix-toast"
import {
  getAdminContext,
  getAllProfiles,
  updateProfileAdminNotes,
} from "~/business/admin/admin.server"
import { can, PERMISSIONS } from "~/business/auth/permissions"
import { syncVeteransListmonkList } from "~/business/newsletter/veterans-list.server"
import { SyncVeteransListButton } from "~/components/pages/admin/participants/sync-veterans-list-button"
import { AllParticipantsTable } from "~/components/organisms/tables/admin/all-participants-table"
import { adminParticipantsCopy } from "~/copy/admin/participants"
import { metaCopy } from "~/copy/meta"
import { createMetaArray } from "~/lib/helpers/meta"
import { logger } from "~/lib/logger/logger.server"
import paths from "~/lib/paths"
import type { Route } from "./+types/participants-page"

const {
  admin: { ADMIN_DASHBOARD },
} = paths

export function meta({}: Route.MetaArgs) {
  return createMetaArray(metaCopy.adminParticipants.title)
}

export async function loader() {
  const result = await getAllProfiles()
  if (!result.success) {
    return redirectWithError(
      ADMIN_DASHBOARD,
      adminParticipantsCopy.list.loadFailed,
    )
  }
  return { profiles: result.data }
}

export async function action({ request, params }: ActionFunctionArgs) {
  const { currentProfile } = await getAdminContext(request, params)

  const formData = await request.formData()
  const intent = formData.get("intent")

  if (intent === "update-profile-admin-notes") {
    const result = await updateProfileAdminNotes(Object.fromEntries(formData))
    return result
  }

  if (intent === "sync-veterans-list") {
    if (!can(currentProfile, PERMISSIONS.NEWSLETTER_MANAGE)) {
      return { intent, error: adminParticipantsCopy.veteransSync.forbidden }
    }
    const result = await syncVeteransListmonkList()
    if (!result.success) {
      logger.error("Failed to sync the Veterans Listmonk list", {
        errors: result.errors,
      })
      return { intent, error: adminParticipantsCopy.veteransSync.failed }
    }
    return { intent, result: result.data }
  }

  return null
}

const ParticipantsPage = () => {
  const { profiles } = useLoaderData<typeof loader>()

  return (
    <>
      <div className="flex items-start justify-between gap-4 mb-4">
        <h1 className="text-2xl font-bold">
          {adminParticipantsCopy.list.title}
        </h1>
        <SyncVeteransListButton />
      </div>
      <AllParticipantsTable profiles={profiles} />
    </>
  )
}

export default ParticipantsPage
