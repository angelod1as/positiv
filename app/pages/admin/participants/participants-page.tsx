import { useLoaderData } from "react-router"
import { redirectWithError } from "remix-toast"
import { getAllProfiles } from "~/business/admin/admin.server"
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
      <h1>Perfis</h1>
      {profiles.length === 0 ? (
        <p>Nenhum perfil encontrado</p>
      ) : (
        <>
          <p>{profiles.length} perfis</p>
          <div className="mt-4 p-4 border rounded-lg bg-muted">
            <p className="text-muted-foreground">
              Tabela de perfis será implementada em breve
            </p>
          </div>
        </>
      )}
    </>
  )
}

export default ParticipantsPage
