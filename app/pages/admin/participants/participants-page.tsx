import { useLoaderData } from "react-router"
import { redirectWithError } from "remix-toast"
import { getAllProfiles } from "~/business/admin/admin.server"
import { AllParticipantsTable } from "~/components/organisms/tables/admin/all-participants-table"
import paths from "~/lib/paths"

const {
  admin: { ADMIN_DASHBOARD },
} = paths

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
