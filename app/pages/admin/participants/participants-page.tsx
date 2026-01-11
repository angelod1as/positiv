import { useLoaderData } from "react-router"
import { getAllProfiles } from "~/business/admin/admin.server"
import type { ProfileGlobal } from "~types/database/entities.types"

export async function loader() {
  const result = await getAllProfiles()
  if (!result.success) {
    return { profiles: [] as ProfileGlobal[] }
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
