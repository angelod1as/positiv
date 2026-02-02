import type { ActionFunctionArgs } from "react-router"
import { useLoaderData } from "react-router"
import { redirectWithError } from "remix-toast"
import {
  getAllProfiles,
  updateProfileAdminNotes,
} from "~/business/admin/admin.server"
import { AllParticipantsTable } from "~/components/organisms/tables/admin/all-participants-table"
import { createMetaArray } from "~/lib/helpers/meta"
import paths from "~/lib/paths"
import type { Route } from "./+types/participants-page"

const {
  admin: { ADMIN_DASHBOARD },
} = paths

export function meta({}: Route.MetaArgs) {
  return createMetaArray("Admin - Participantes")
}

export async function loader() {
  const result = await getAllProfiles()
  if (!result.success) {
    return redirectWithError(
      ADMIN_DASHBOARD,
      "Erro ao carregar perfis. Tente novamente.",
    )
  }
  return { profiles: result.data }
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData()
  const intent = formData.get("intent")

  if (intent === "update-profile-admin-notes") {
    const result = await updateProfileAdminNotes(Object.fromEntries(formData))
    return result
  }

  return null
}

const ParticipantsPage = () => {
  const { profiles } = useLoaderData<typeof loader>()

  return (
    <>
      <h1 className="text-2xl font-bold mb-4">Perfis</h1>
      <AllParticipantsTable profiles={profiles} />
    </>
  )
}

export default ParticipantsPage
